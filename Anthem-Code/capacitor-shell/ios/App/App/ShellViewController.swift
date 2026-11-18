import UIKit
import WebKit
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
/// and the `window.SamecorShell` bridge the site already calls (getAppVersion, setSystemBarColor).
/// Downloads, new windows, print and share are handled by ShellWebFeatures.
final class SamecorBridgeViewController: CAPBridgeViewController, WKScriptMessageHandler {
    private static let messageHandlerName = "samecorShell"

    var onThemeChange: ((UIColor, Bool) -> Void)?
    private let webFeatures = ShellWebFeatures()

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
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.messageHandlerName, let body = message.body as? [String: Any] else { return }
        switch body["type"] as? String {
        case "theme":
            guard let hex = body["hex"] as? String, let color = UIColor(shellHex: hex) else { return }
            onThemeChange?(color, body["dark"] as? Bool ?? false)
        case "print":
            webFeatures.printPage()
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
          window.SamecorShell = {
            getAppVersion: function () { return version; },
            setSystemBarColor: function (hex, dark) { post({ type: "theme", hex: String(hex), dark: !!dark }); }
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
