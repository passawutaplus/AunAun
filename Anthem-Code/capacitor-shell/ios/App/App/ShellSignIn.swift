import UIKit
import AuthenticationServices

/// Sign-in that cannot happen inside the web view (the page calls it through `window.SamecorShell`):
/// - Google / LINE / Facebook open in `ASWebAuthenticationSession`, because Google refuses sign-in inside WKWebView.
///   Supabase sends the browser to https://samecor.com/auth/app-return, which jumps to com.samecor.app://auth/…
///   (public/app-return.js); the session catches that URL and the shell loads the matching samecor.com page in the
///   web view, which holds the PKCE verifier.
/// - Sign in with Apple uses Apple's own sheet (App Review 4.8) and hands the identity token to the page, which signs
///   in with Supabase `signInWithIdToken`.
final class ShellSignIn: NSObject {
    static let callbackScheme = "com.samecor.app"

    private weak var presenter: UIViewController?
    private var webSession: ASWebAuthenticationSession?
    private var appleCompletion: (([String: Any]) -> Void)?

    init(presenter: UIViewController) {
        self.presenter = presenter
    }

    /// Opens `url`. `completion` gets the com.samecor.app://auth/… URL, or nil when the user closed the sheet.
    func startWebSignIn(url: URL, completion: @escaping (URL?) -> Void) {
        webSession?.cancel()
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: Self.callbackScheme) { [weak self] callbackURL, _ in
            DispatchQueue.main.async {
                self?.webSession = nil
                completion(callbackURL)
            }
        }
        session.presentationContextProvider = self
        // Keep Safari's cookies so Google / LINE / Facebook remember the account between sign-ins.
        session.prefersEphemeralWebBrowserSession = false
        webSession = session
        if !session.start() {
            webSession = nil
            completion(nil)
        }
    }

    /// `nonceHash` is the SHA-256 (hex) of the nonce the page sends to Supabase. The result is
    /// `["token": …, "name": …]` or `["error": "canceled" | message]`.
    func startApple(nonceHash: String, completion: @escaping ([String: Any]) -> Void) {
        finishApple(["error": "canceled"])
        appleCompletion = completion
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = nonceHash
        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    private func finishApple(_ result: [String: Any]) {
        let completion = appleCompletion
        appleCompletion = nil
        completion?(result)
    }

    private func anchor() -> ASPresentationAnchor {
        if let window = presenter?.view.window { return window }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap { $0.windows }.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

extension ShellSignIn: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor()
    }
}

extension ShellSignIn: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        anchor()
    }
}

extension ShellSignIn: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            finishApple(["error": "Apple did not return an identity token"])
            return
        }
        var result: [String: Any] = ["token": token]
        // Apple shares the name only the first time someone signs in to the app.
        if let name = credential.fullName {
            let formatted = PersonNameComponentsFormatter().string(from: name).trimmingCharacters(in: .whitespacesAndNewlines)
            if !formatted.isEmpty { result["name"] = formatted }
        }
        finishApple(result)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let canceled = (error as? ASAuthorizationError)?.code == .canceled
        finishApple(["error": canceled ? "canceled" : error.localizedDescription])
    }
}
