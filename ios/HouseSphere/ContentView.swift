import SwiftUI
import UIKit
import WebKit

private let appURL = URL(string: "https://housesphere.vercel.app/")!
private let appHost = "housesphere.vercel.app"

struct ContentView: View {
    @StateObject private var model = WebViewModel()

    var body: some View {
        ZStack {
            WebView(model: model)
                .ignoresSafeArea(edges: .bottom)

            if model.isLoading && model.errorMessage == nil {
                ProgressView()
                    .controlSize(.large)
                    .tint(Color(red: 0.059, green: 0.463, blue: 0.431))
            }

            if let message = model.errorMessage {
                VStack(spacing: 14) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 34))
                        .foregroundStyle(.secondary)
                    Text("Can't reach HouseSphere")
                        .font(.headline)
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Try again") {
                        model.load()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 0.059, green: 0.463, blue: 0.431))
                }
                .padding(24)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
                .padding(32)
            }
        }
        .preferredColorScheme(.light)
    }
}

struct WebView: UIViewRepresentable {
    @ObservedObject var model: WebViewModel

    func makeUIView(context: Context) -> WKWebView {
        model.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

final class WebViewModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var isLoading = true
    @Published var errorMessage: String?

    let webView: WKWebView

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        webView.scrollView.refreshControl = UIRefreshControl()
        webView.scrollView.refreshControl?.addTarget(self, action: #selector(refresh), for: .valueChanged)

        load()
    }

    func load() {
        errorMessage = nil
        isLoading = true
        webView.load(URLRequest(url: appURL))
    }

    @objc private func refresh() {
        webView.reload()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        errorMessage = nil
        webView.scrollView.refreshControl?.endRefreshing()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        handle(error)
    }

    private func handle(_ error: Error) {
        isLoading = false
        webView.scrollView.refreshControl?.endRefreshing()
        let nsError = error as NSError
        if nsError.code == NSURLErrorCancelled { return }
        errorMessage = "Check your connection and try again. Your saved household data is still on this device."
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if url.scheme == "about" {
            decisionHandler(.allow)
            return
        }

        if let host = url.host, host == appHost {
            decisionHandler(.allow)
            return
        }

        if navigationAction.navigationType == .linkActivated || navigationAction.targetFrame == nil {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if let host = url.host, host == appHost {
            webView.load(URLRequest(url: url))
        } else {
            UIApplication.shared.open(url)
        }
        return nil
    }
}
