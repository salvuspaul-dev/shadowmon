# Usage: python3 tools/shot.py <out.png> [hash] [js-to-eval] [wait_ms] [w] [h]
import sys, asyncio
from playwright.async_api import async_playwright
out=sys.argv[1]; hsh=sys.argv[2] if len(sys.argv)>2 else ''; js=sys.argv[3] if len(sys.argv)>3 else ''
wait=int(sys.argv[4]) if len(sys.argv)>4 else 800; w=int(sys.argv[5]) if len(sys.argv)>5 else 1280; h=int(sys.argv[6]) if len(sys.argv)>6 else 720
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':w,'height':h})
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
        await pg.goto('file:///home/claude/shadowmon/dist/index.html'+hsh)
        await pg.wait_for_function('window.__shadowmon', timeout=5000)
        if js:
            r=await pg.evaluate(js); print('eval:', r)
        await pg.wait_for_timeout(wait)
        await pg.screenshot(path=out)
        print('errors:', errs)
        await b.close()
asyncio.run(main())
