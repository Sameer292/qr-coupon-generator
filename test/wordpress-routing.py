"""Run against the local Compose preview with both plugins active (no imports needed)."""

from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = build_opener(NoRedirect)
token = "UNKNOWN_" + "0" * 24
# shortcut: checks share the plugins' per-IP rate limits; isolate requests for repeated CI runs.
cases = [
    (f"/claim/?t={token}", "Coupon not found"),
    (f"/claim/{token}/", "Coupon not found"),
    (f"/?fm_cash_claim=1&t={token}", "Coupon not found"),
    (f"/verify/?t={token}", "Invalid Coupon"),
]
for host in ("localhost:8080", "127.0.0.1:8080", "preview.local:8080", "preview.test:8080"):
    for path, expected in cases:
        request = Request("http://127.0.0.1:8080" + path, headers={"Host": host})
        try:
            response = opener.open(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            body = response.read().decode()
            assert response.status == 404, (host, path, response.status, response.headers.get("Location"))
            assert expected in body, (host, path, expected)
        print(f"PASS {host}{path}")

for host in ("example.com:8080", "localhost.evil.invalid:8080", "127.0.0.1.evil.invalid:8080"):
    request = Request("http://127.0.0.1:8080/verify/?t=" + token, headers={"Host": host})
    try:
        response = opener.open(request, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == 301, (host, response.status)
    print(f"PASS HTTPS redirect retained for {host}")
