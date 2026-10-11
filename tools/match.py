# Runs an AI-vs-AI match at high speed and reports the flow. Usage: python3 tools/match.py [out.png]
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]
        pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
        await pg.goto('file:///home/claude/shadowmon/dist/index.html#demo')
        await pg.wait_for_function('window.__shadowmon', timeout=5000)
        await pg.evaluate('window.__shadowmon.speed=12')
        log=[]
        for i in range(60):
            await pg.wait_for_timeout(500)
            s=await pg.evaluate('(()=>{const g=window.__shadowmon;return {phase:g.phase,round:g.round,wins:g.wins,timer:Math.round(g.timer),hp:[Math.round(g.p1.hp),Math.round(g.p2.hp)],st:[g.p1.state,g.p2.state]}})()')
            log.append(s)
            if s['phase']=='result': break
        for s in log[::3]+[log[-1]]: print(json.dumps(s))
        if len(sys.argv)>1: await pg.screenshot(path=sys.argv[1])
        print('errors:', errs)
        await b.close()
asyncio.run(main())
