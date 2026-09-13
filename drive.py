import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:3000"

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def reveal(page):
    """Scroll the whole page so Framer `whileInView` triggers, then force a
    resize so Recharts ResponsiveContainers remeasure, then return to top."""
    h = page.evaluate("document.body.scrollHeight")
    y = 0
    while y < h:
        page.mouse.wheel(0, 600)
        page.wait_for_timeout(180)
        y += 600
    page.evaluate("window.dispatchEvent(new Event('resize'))")
    page.wait_for_timeout(1500)
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(400)


def shot(page, name):
    reveal(page)
    p = OUT / name
    page.screenshot(path=str(p), full_page=True)
    print(f"  shot -> {p}")


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    print("1) Landing")
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(1200)
    shot(page, "01_landing.png")

    print("2) Assessment wizard")
    page.goto(f"{BASE}/assessment", wait_until="networkidle")

    # Step 0 — Education
    page.get_by_role("button", name="BCA", exact=True).click()
    page.get_by_role("button", name="Continue").click()

    # Step 1 — Skills
    for s in ["Excel", "Python", "SQL", "Data Analysis"]:
        page.get_by_role("button", name=s, exact=True).click()
    shot(page, "02_wizard_skills.png")
    page.get_by_role("button", name="Continue").click()

    # Step 2 — Interests
    for s in ["Data", "AI"]:
        page.get_by_role("button", name=s, exact=True).click()
    page.get_by_role("button", name="Continue").click()

    # Step 3 — Experience (leave at default), Continue
    page.get_by_role("button", name="Continue").click()

    # Step 4 — Passout year (default ok), Continue
    page.get_by_role("button", name="Continue").click()

    # Step 5 — Preference
    page.get_by_role("button", name="High Salary", exact=True).click()
    page.get_by_role("button", name="Get my Top 3 careers").click()

    print("3) Dashboard")
    page.wait_for_url("**/dashboard", timeout=15000)
    page.wait_for_timeout(2500)  # let charts + framer animations settle
    shot(page, "03_dashboard.png")

    # capture just the first career card region too
    print("4) Explorer")
    page.goto(f"{BASE}/explorer", wait_until="networkidle")
    page.wait_for_timeout(2000)
    shot(page, "04_explorer.png")

    print("5) Profile")
    page.goto(f"{BASE}/profile", wait_until="networkidle")
    page.wait_for_timeout(1200)
    shot(page, "05_profile.png")

    print("DONE")
    browser.close()
