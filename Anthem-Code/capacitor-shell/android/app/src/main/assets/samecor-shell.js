/*
 * Runs at document start on https://samecor.com pages inside the Android app (MainActivity adds it with
 * WebViewCompat.addDocumentStartJavaScript). Fills what Android's WebView lacks, through window.SamecorShell
 * (MainActivity.ShellBridge), like ios/App/App/ShellViewController.swift does on iPhone:
 * - window.print() opens the Android print dialog (the site prints in the page: src/lib/documents/printDocument.ts);
 * - navigator.share() opens the Android share sheet;
 * - blob: / data: links and links with a `download` attribute are saved to Downloads.
 */
(function () {
  if (window.__samecorShellPage) return;
  window.__samecorShellPage = true;
  var shell = window.SamecorShell;
  if (!shell) return;

  window.print = function () {
    try {
      shell.print(String(document.title || "SAMECOR"));
    } catch (e) {
      /* old app build */
    }
  };

  if (typeof navigator.share !== "function") {
    navigator.share = function (data) {
      data = data || {};
      if (data.files && data.files.length) {
        return Promise.reject(new DOMException("Sharing files is not supported", "NotAllowedError"));
      }
      try {
        shell.share(String(data.title || ""), String(data.text || ""), String(data.url || ""));
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    };
    navigator.canShare = function (data) {
      return !(data && data.files && data.files.length);
    };
  }

  function readAsBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || "");
        resolve(text.slice(text.indexOf(",") + 1));
      };
      reader.onerror = function () {
        reject(reader.error);
      };
      reader.readAsDataURL(blob);
    });
  }

  /** Page-made files (blob:, data:) are read here and handed over; web files go to Android's download manager. */
  function save(href, name) {
    if (/^(blob|data):/i.test(href)) {
      fetch(href)
        .then(function (res) {
          return res.blob();
        })
        .then(function (blob) {
          return readAsBase64(blob).then(function (base64) {
            shell.saveFile(name, blob.type || "", base64);
          });
        })
        .catch(function () {
          shell.saveFailed();
        });
      return true;
    }
    if (/^https?:/i.test(href)) {
      shell.downloadUrl(href, name);
      return true;
    }
    return false;
  }

  function handleAnchor(a) {
    if (!a || !a.href) return false;
    var isPageFile = /^(blob|data):/i.test(a.href);
    if (!isPageFile && !a.hasAttribute("download")) return false;
    return save(a.href, a.getAttribute("download") || "");
  }

  // Scripts that build a link and call a.click() (src/lib/downloadBlob.ts, csv.ts, ProfileQrCode, ...).
  var nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (handleAnchor(this)) return;
    return nativeClick.apply(this, arguments);
  };

  // Taps on download links (chat attachments, PDFs). Runs after the page's own handlers, so a page that
  // cancels the click keeps control.
  window.addEventListener("click", function (event) {
    if (event.defaultPrevented) return;
    var target = event.target;
    var a = target && target.closest ? target.closest("a[href]") : null;
    if (a && handleAnchor(a)) event.preventDefault();
  });

  // Blob links the listeners above missed reach MainActivity's DownloadListener, which calls this.
  window.__samecorShellSaveBlob = function (href, name) {
    save(href, name || "");
  };
})();
