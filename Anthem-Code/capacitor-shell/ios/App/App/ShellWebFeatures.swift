import UIKit
import WebKit

/// Fills the gaps a bare WKWebView leaves on iOS. Capacitor's own handling stays in place: every delegate call this
/// class does not handle is forwarded to Capacitor's WebViewDelegationHandler.
/// - File downloads (blob links, links with `download`, attachments) save to a temporary file and open the iOS share
///   sheet (Save to Files, Save Image, AirDrop). WKWebView would otherwise do nothing.
/// - Same-site links that ask for a new window (`target="_blank"`, `window.open`) load in the app instead of Safari.
/// - `window.print()` opens the iOS print sheet; `navigator.share()` falls back to the native share sheet.
final class ShellWebFeatures: NSObject {
    private weak var webView: WKWebView?
    private weak var presenter: UIViewController?
    private weak var capacitorNavigation: WKNavigationDelegate?
    private weak var capacitorUI: WKUIDelegate?
    private var appURL: URL?
    private var downloads: [ObjectIdentifier: URL] = [:]

    private static let downloadsFolder = FileManager.default.temporaryDirectory
        .appendingPathComponent("SamecorDownloads", isDirectory: true)

    /// Call from capacitorDidLoad, after Capacitor set its delegates and before the first page loads.
    func install(on webView: WKWebView, appURL: URL?, presenter: UIViewController) {
        self.webView = webView
        self.presenter = presenter
        self.appURL = appURL
        capacitorNavigation = webView.navigationDelegate
        capacitorUI = webView.uiDelegate
        webView.navigationDelegate = self
        webView.uiDelegate = self
        // Files shared in an earlier session are no longer needed.
        try? FileManager.default.removeItem(at: Self.downloadsFolder)
    }

    // MARK: - Forwarding to Capacitor

    override func responds(to aSelector: Selector!) -> Bool {
        super.responds(to: aSelector)
            || (capacitorNavigation?.responds(to: aSelector) ?? false)
            || (capacitorUI?.responds(to: aSelector) ?? false)
    }

    override func forwardingTarget(for aSelector: Selector!) -> Any? {
        if let navigation = capacitorNavigation, navigation.responds(to: aSelector) { return navigation }
        if let ui = capacitorUI, ui.responds(to: aSelector) { return ui }
        return super.forwardingTarget(for: aSelector)
    }

    // MARK: - Print and share (called from the page through window.SamecorShell)

    func printPage() {
        guard let webView = webView else { return }
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .general
        info.jobName = webView.title ?? "SAMECOR"
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printFormatter = webView.viewPrintFormatter()
        // Pages that set up print-only content (src/lib/documents/printDocument.ts) clean up on afterprint.
        controller.present(animated: true) { [weak webView] _, _, _ in
            webView?.evaluateJavaScript("window.dispatchEvent(new Event('afterprint'))")
        }
    }

    func share(title: String, text: String, url: String, completion: @escaping (Bool) -> Void) {
        var items: [Any] = []
        let message = [title, text].filter { !$0.isEmpty }.joined(separator: "\n")
        if !message.isEmpty { items.append(message) }
        if let link = URL(string: url), !url.isEmpty { items.append(link) }
        guard !items.isEmpty else {
            completion(false)
            return
        }
        presentShareSheet(items, completion: completion)
    }

    private func presentShareSheet(_ items: [Any], completion: ((Bool) -> Void)?) {
        guard let presenter = presenter, presenter.presentedViewController == nil else {
            completion?(false)
            return
        }
        let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
        sheet.completionWithItemsHandler = { _, completed, _, _ in completion?(completed) }
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.maxY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        presenter.present(sheet, animated: true)
    }

    // MARK: - Helpers

    /// blob: and data: URLs only exist inside the page, so opening them in Safari can never work.
    private static func isInPageFile(_ url: URL?) -> Bool {
        guard let scheme = url?.scheme?.lowercased() else { return false }
        return scheme == "blob" || scheme == "data"
    }

    private func isAppURL(_ url: URL) -> Bool {
        guard let appURL = appURL else { return false }
        return url.scheme?.lowercased() == appURL.scheme?.lowercased() && url.host?.lowercased() == appURL.host?.lowercased()
    }

    private static func safeFileName(_ name: String) -> String {
        let cleaned = name
            .components(separatedBy: CharacterSet(charactersIn: "/\\:?%*|\"<>"))
            .joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? "samecor-file" : cleaned
    }
}

// MARK: - WKNavigationDelegate

extension ShellWebFeatures: WKNavigationDelegate {
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let topLevel = navigationAction.targetFrame == nil || navigationAction.targetFrame?.isMainFrame == true
        if navigationAction.shouldPerformDownload || (topLevel && Self.isInPageFile(navigationAction.request.url)) {
            decisionHandler(.download)
            return
        }
        if capacitorNavigation?.webView?(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler) == nil {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationResponse: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        let disposition = (navigationResponse.response as? HTTPURLResponse)?
            .value(forHTTPHeaderField: "Content-Disposition")?.lowercased() ?? ""
        if navigationResponse.isForMainFrame && (!navigationResponse.canShowMIMEType || disposition.hasPrefix("attachment")) {
            decisionHandler(.download)
            return
        }
        if capacitorNavigation?.webView?(webView, decidePolicyFor: navigationResponse, decisionHandler: decisionHandler) == nil {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }
}

// MARK: - WKUIDelegate

extension ShellWebFeatures: WKUIDelegate {
    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        let request = navigationAction.request
        if let url = request.url {
            if Self.isInPageFile(url) {
                webView.startDownload(using: request) { [weak self] download in
                    download.delegate = self
                }
                return nil
            }
            if isAppURL(url) {
                webView.load(request)
                return nil
            }
        }
        // Other hosts: Capacitor opens them in Safari.
        return capacitorUI?.webView?(webView, createWebViewWith: configuration, for: navigationAction, windowFeatures: windowFeatures)
    }
}

// MARK: - WKDownloadDelegate

extension ShellWebFeatures: WKDownloadDelegate {
    func download(_ download: WKDownload,
                  decideDestinationUsing response: URLResponse,
                  suggestedFilename: String,
                  completionHandler: @escaping (URL?) -> Void) {
        let folder = Self.downloadsFolder.appendingPathComponent(UUID().uuidString, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        } catch {
            completionHandler(nil)
            return
        }
        let destination = folder.appendingPathComponent(Self.safeFileName(suggestedFilename))
        downloads[ObjectIdentifier(download)] = destination
        completionHandler(destination)
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        presentShareSheet([file], completion: nil)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        guard let file = downloads.removeValue(forKey: ObjectIdentifier(download)) else { return }
        try? FileManager.default.removeItem(at: file.deletingLastPathComponent())
    }
}
