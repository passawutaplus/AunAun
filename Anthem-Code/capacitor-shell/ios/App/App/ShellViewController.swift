import UIKit
import WebKit
import StoreKit
import Capacitor

/// Page background per theme, the same values as THEME_COLOR in src/lib/appShell.ts.
private enum ShellTheme {
    static let light = UIColor(red: 0xF2 / 255, green: 0xF2 / 255, blue: 0xF0 / 255, alpha: 1)
    static let dark = UIColor(red: 0x20 / 255, green: 0x1F / 255, blue: 0x1E / 255, alpha: 1)
}

/// Root of the app. Keeps the web view inside the safe area, the way the Android shell pads its WebView:
/// the page never draws under the status bar, the notch or the home indicator, and those strips take the
/// page's theme colour (the site sends it through `window.SamecorShell.setSystemBarColor`).
final class ShellViewController: UIViewController {
    private let bridgeController = SamecorBridgeViewController()
    private var barStyle: UIStatusBarStyle = .darkContent

    override var preferredStatusBarStyle: UIStatusBarStyle { barStyle }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Until the page reports its theme, follow the system appearance. A dynamic colour is right even when
        // traitCollection is not settled yet in viewDidLoad (iOS 17+).
        view.backgroundColor = UIColor { $0.userInterfaceStyle == .dark ? ShellTheme.dark : ShellTheme.light }
        barStyle = .default
        bridgeController.onThemeChange = { [weak self] color, dark in
            self?.applyTheme(color: color, dark: dark)
        }

        addChild(bridgeController)
        let content: UIView = bridgeController.view
        content.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: safe.topAnchor),
            content.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            content.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: safe.trailingAnchor)
        ])
        bridgeController.didMove(toParent: self)
    }

    private func applyTheme(color: UIColor, dark: Bool) {
        view.backgroundColor = color
        barStyle = dark ? .lightContent : .darkContent
        setNeedsStatusBarAppearanceUpdate()
    }
}

/// Capacitor's view controller plus what the Android MainActivity adds: swipe back through page history,
/// and the `window.SamecorShell` bridge the site calls (src/lib/appShell.ts, src/lib/nativeShell.ts).
/// Downloads, new windows, print and share are handled by ShellWebFeatures; sign-in by ShellSignIn.
final class SamecorBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private static let messageHandlerName = "samecorShell"
    /// What this build can do natively (src/lib/nativeShell.ts → hasShellFeature). Older builds report nothing.
    private static let features = "auth,apple,review,print,share,download,push"

    var onThemeChange: ((UIColor, Bool) -> Void)?
    private let webFeatures = ShellWebFeatures()
    private lazy var signIn = ShellSignIn(presenter: self)
    private var linkObservers: [NSObjectProtocol] = []

    deinit {
        linkObservers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }

        // Edge swipe goes back a page, like Safari (the site is a single-page app, so this walks its history).
        webView.allowsBackForwardNavigationGestures = true
        // Let the shell's background show while the page loads instead of a white flash.
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        webFeatures.install(on: webView, appURL: bridge?.config.serverURL, presenter: self)

        let contentController = webView.configuration.userContentController
        contentController.addUserScript(
            WKUserScript(source: Self.bridgeScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
        contentController.add(WeakScriptMessageHandler(self), name: Self.messageHandlerName)

        // Universal links (samecor.com pages, see public/.well-known/apple-app-site-association) and sign-in coming
        // back from Safari as com.samecor.app://auth/… Capacitor's scene proxy posts these, on a cold start once
        // the web view has appeared.
        let center = NotificationCenter.default
        linkObservers = [
            center.addObserver(forName: .capacitorSceneOpenUniversalLink, object: nil, queue: .main) { [weak self] note in
                if let url = note.userInfo?["url"] as? URL { self?.openLink(url) }
            },
            center.addObserver(forName: .capacitorSceneOpenURL, object: nil, queue: .main) { [weak self] note in
                if let url = note.userInfo?["url"] as? URL { self?.openLink(url) }
            }
        ]
    }

    // MARK: - Links into the app

    private var siteURL: URL? { bridge?.config.serverURL }

    private func isSitePage(_ url: URL?) -> Bool {
        guard let url = url, let site = siteURL else { return false }
        return url.scheme?.lowercased() == "https" && url.host?.lowercased() == site.host?.lowercased()
    }

    /// com.samecor.app://auth/callback?code=… → https://samecor.com/auth/callback?code=… (only these two pages).
    private func authReturnTarget(_ url: URL) -> URL? {
        guard url.scheme?.lowercased() == ShellSignIn.callbackScheme, url.host?.lowercased() == "auth",
              let site = siteURL else { return nil }
        let page: String
        switch url.path {
        case "", "/", "/callback": page = "/auth/callback"
        case "/reset-password": page = "/reset-password"
        default: return nil
        }
        let source = URLComponents(url: url, resolvingAgainstBaseURL: false)
        var target = URLComponents()
        target.scheme = site.scheme
        target.host = site.host
        target.path = page
        target.percentEncodedQuery = source?.percentEncodedQuery
        target.percentEncodedFragment = source?.percentEncodedFragment
        return target.url
    }

    private func openLink(_ url: URL) {
        guard let webView = webView else { return }
        if let target = authReturnTarget(url) {
            // A full load: the callback page exchanges the code with the verifier this web view stored.
            webView.load(URLRequest(url: target))
            return
        }
        guard isSitePage(url) else { return }
        // Move the single-page app without a reload when it is already showing the site (same as nativePush.ts).
        let quoted = (try? JSONEncoder().encode(url.absoluteString)).flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
        let script = "(function(u){try{var t=new URL(u);if(t.origin!==location.origin)return false;"
            + "history.pushState(null,'',t.pathname+t.search+t.hash);dispatchEvent(new PopStateEvent('popstate'));return true;}"
            + "catch(e){return false;}})(\(quoted))"
        webView.evaluateJavaScript(script) { result, _ in
            if (result as? Bool) != true { webView.load(URLRequest(url: url)) }
        }
    }

    // MARK: - Page bridge

    private func reply(_ id: Int, _ result: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: result),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.__samecorShellReply && window.__samecorShellReply(\(id), \(json))")
    }

    private func requestStoreReview() {
        guard let scene = view.window?.windowScene else { return }
        if #available(iOS 16.0, *) {
            AppStore.requestReview(in: scene)
        } else {
            SKStoreReviewController.requestReview(in: scene)
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageHandlerName, let body = message.body as? [String: Any] else { return }
        // Sign-in and the rating sheet answer only the site's own top page, never an embedded frame.
        let fromSite = message.frameInfo.isMainFrame
            && message.frameInfo.securityOrigin.host.lowercased() == siteURL?.host?.lowercased()
        switch body["type"] as? String {
        case "theme":
            guard let hex = body["hex"] as? String, let color = UIColor(shellHex: hex) else { return }
            onThemeChange?(color, body["dark"] as? Bool ?? false)
        case "print":
            webFeatures.printPage()
        case "auth":
            guard fromSite, let raw = body["url"] as? String, let url = URL(string: raw),
                  url.scheme?.lowercased() == "https" else { return }
            signIn.startWebSignIn(url: url) { [weak self] callbackURL in
                if let callbackURL = callbackURL { self?.openLink(callbackURL) }
            }
        case "apple":
            guard let id = body["id"] as? Int else { return }
            guard fromSite, let nonce = body["nonce"] as? String, !nonce.isEmpty else {
                reply(id, ["error": "unavailable"])
                return
            }
            signIn.startApple(nonceHash: nonce) { [weak self] result in
                self?.reply(id, result)
            }
        case "review":
            if fromSite { requestStoreReview() }
        case "share":
            guard let id = body["id"] as? Int else { return }
            webFeatures.share(
                title: body["title"] as? String ?? "",
                text: body["text"] as? String ?? "",
                url: body["url"] as? String ?? ""
            ) { [weak self] completed in
                self?.webView?.evaluateJavaScript("window.__samecorShellShareDone && window.__samecorShellShareDone(\(id), \(completed))")
            }
        default:
            break
        }
    }

    /// "1.0.0 (12)", the same shape the Android bridge returns.
    private static func appVersion() -> String {
        let info = Bundle.main.infoDictionary
        let name = info?["CFBundleShortVersionString"] as? String ?? ""
        let build = info?["CFBundleVersion"] as? String ?? ""
        return build.isEmpty ? name : "\(name) (\(build))"
    }

    private static func bridgeScript() -> String {
        let version = (try? JSONEncoder().encode(appVersion())).flatMap { String(data: $0, encoding: .utf8) } ?? "\"\""
        return """
        (function () {
          if (window.SamecorShell) return;
          var version = \(version);
          function post(message) {
            try { window.webkit.messageHandlers.\(messageHandlerName).postMessage(message); } catch (e) {}
          }
          var replies = {};
          var nextReply = 0;
          window.__samecorShellReply = function (id, result) {
            var resolve = replies[id];
            if (!resolve) return;
            delete replies[id];
            resolve(result);
          };
          function ask(message) {
            return new Promise(function (resolve) {
              message.id = ++nextReply;
              replies[message.id] = resolve;
              post(message);
            });
          }
          window.SamecorShell = {
            getAppVersion: function () { return version; },
            getFeatures: function () { return "\(features)"; },
            setSystemBarColor: function (hex, dark) { post({ type: "theme", hex: String(hex), dark: !!dark }); },
            openAuth: function (url) { post({ type: "auth", url: String(url) }); },
            requestReview: function () { post({ type: "review" }); },
            signInWithApple: function (nonceHash) { return ask({ type: "apple", nonce: String(nonceHash) }); }
          };
          // WKWebView has no print dialog of its own.
          window.print = function () { post({ type: "print" }); };
          // Native share sheet when WebKit does not offer navigator.share.
          if (typeof navigator.share !== "function") {
            var pending = {};
            var nextId = 0;
            window.__samecorShellShareDone = function (id, completed) {
              var call = pending[id];
              if (!call) return;
              delete pending[id];
              if (completed) call.resolve();
              else call.reject(new DOMException("Share canceled", "AbortError"));
            };
            navigator.share = function (data) {
              data = data || {};
              return new Promise(function (resolve, reject) {
                var id = ++nextId;
                pending[id] = { resolve: resolve, reject: reject };
                post({ type: "share", id: id, title: String(data.title || ""), text: String(data.text || ""), url: String(data.url || "") });
              });
            };
          }
        })();
        """
    }
}

/// WKUserContentController keeps its handlers alive; this breaks the cycle with the view controller.
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

private extension UIColor {
    /// "#RRGGBB" from the site; nil for anything else.
    convenience init?(shellHex: String) {
        var hex = shellHex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hex.hasPrefix("#") { hex.removeFirst() }
        guard hex.count == 6, let value = UInt32(hex, radix: 16) else { return nil }
        self.init(
            red: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }
}
