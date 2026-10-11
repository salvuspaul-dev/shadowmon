# Drives the game like a player: mouse on the menu, keyboard in the fight, then touch on a phone-sized upright screen.
import asyncio, json, sys
from playwright.async_api import async_playwright
S=sys.argv[1]
ST='(()=>{const g=window.__shadowmon;return {scene:g.scene,phase:g.phase,paused:g.paused,W:g.W,rot:g.rotated,p1:{k:g.p1.kind,x:Math.round(g.p1.x),y:Math.round(g.p1.y),st:g.p1.state,hp:Math.round(g.p1.hp),en:Math.round(g.p1.energy)},p2:{k:g.p2.kind,x:Math.round(g.p2.x),st:g.p2.state,hp:Math.round(g.p2.hp)},projs:g.fx.projs.length,lvl:g.sel.level}})()'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        errs=[]
        def hook(pg):
            pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
            pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
        # ---- desktop: mouse + keyboard ----
        pg=await b.new_page(viewport={'width':1280,'height':720}); hook(pg)
        await pg.goto('file:///home/claude/shadowmon/dist/index.html'); await pg.wait_for_function('window.__shadowmon')
        await pg.mouse.click(980,400)            # pick Aquarion
        await pg.mouse.click(540,472)            # EASY
        await pg.wait_for_timeout(100); print('menu', await pg.evaluate(ST))
        await pg.mouse.click(640,394)            # FIGHT
        await pg.wait_for_timeout(1900); s0=await pg.evaluate(ST); print('start', s0)
        # make the CPU passive so the checks below are deterministic
        await pg.evaluate('window.__shadowmon.ai.think=()=>({mx:0,jump:false,attack:false,heavy:false,special:false,dash:false})')
        await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(700); await pg.keyboard.up('KeyD')
        s1=await pg.evaluate(ST); print('walked', s1['p1']['x']-s0['p1']['x'], 'px ->', s1['p1'])
        for i in range(3):
            await pg.keyboard.press('KeyJ'); await pg.wait_for_timeout(190)
        await pg.wait_for_timeout(300); s2=await pg.evaluate(ST); print('after 3x attack: cpu hp', s1['p2']['hp'],'->',s2['p2']['hp'], s2['p2']['st'])
        await pg.wait_for_timeout(1400)
        await pg.keyboard.press('KeyL'); await pg.wait_for_timeout(330); s3=await pg.evaluate(ST); print('blast: projs', s3['projs'], 'energy', s2['p1']['en'],'->',s3['p1']['en'])
        await pg.wait_for_timeout(900); s3b=await pg.evaluate(ST); print('blast landed: cpu hp', s2['p2']['hp'],'->',s3b['p2']['hp'])
        await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(180); s4=await pg.evaluate(ST); print('jump: y', s4['p1']['y'], s4['p1']['st'])
        await pg.wait_for_timeout(900)
        await pg.keyboard.press('ShiftLeft'); await pg.wait_for_timeout(60); s5=await pg.evaluate(ST); print('dash:', s5['p1']['st'])
        await pg.wait_for_timeout(1500); await pg.keyboard.press('KeyK'); await pg.wait_for_timeout(330); await pg.screenshot(path=S+'/strike.png'); s6=await pg.evaluate(ST); print('strike:', s6['p1']['st'], 'cpu hp', s6['p2']['hp'])
        # CPU attacks while player holds back -> block
        await pg.wait_for_timeout(1500)
        await pg.evaluate('(()=>{const g=window.__shadowmon; g.p1.x=1000; g.p2.x=1120; g.p1.state="idle"; g.p2.state="idle"; g.p1.y=0;g.p2.y=0; let n=0; g.ai.think=()=>({mx:0,jump:false,attack:n++==20,heavy:false,special:false,dash:false})})()')
        hp0=(await pg.evaluate(ST))['p1']['hp']
        await pg.keyboard.down('KeyA'); await pg.wait_for_timeout(700); sB=await pg.evaluate(ST); await pg.keyboard.up('KeyA')
        print('block: player hp', hp0,'->',sB['p1']['hp'], '(unblocked jab would be 42+)')
        await pg.keyboard.press('KeyP'); await pg.wait_for_timeout(150); print('paused', (await pg.evaluate(ST))['paused']); await pg.screenshot(path=S+'/pause.png')
        await pg.mouse.click(640,342); await pg.wait_for_timeout(100); print('resume click -> paused', (await pg.evaluate(ST))['paused'])
        await pg.close()
        # ---- phone held upright: touch, rotated layout ----
        ctx=await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg=await ctx.new_page(); hook(pg)
        await pg.goto('file:///home/claude/shadowmon/dist/index.html'); await pg.wait_for_function('window.__shadowmon')
        s=await pg.evaluate(ST); print('phone upright', {'W':s['W'],'rot':s['rot']})
        # logical (x,y) -> screen for the rotated canvas
        box=await pg.evaluate('(()=>{const r=document.getElementById("game").getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()')
        W=s['W']
        def scr(x,y): return (box[0]+box[2]-(y/720)*box[2], box[1]+(x/W)*box[3])
        await pg.touchscreen.tap(*scr(W/2,394)); await pg.wait_for_timeout(1900)
        s=await pg.evaluate(ST); print('touch FIGHT ->', s['scene'], s['phase'])
        await pg.evaluate('window.__shadowmon.ai.think=()=>({mx:0,jump:false,attack:false,heavy:false,special:false,dash:false})')
        x0=s['p1']['x']
        cdp=await ctx.new_cdp_session(pg)
        sx,sy=scr(141+60,562)
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1}]})
        await pg.wait_for_timeout(600)
        ax,ay=scr(W-87,604)
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1},{'x':ax,'y':ay,'id':2}]})
        await pg.wait_for_timeout(60); s=await pg.evaluate(ST); await pg.screenshot(path=S+'/phone.png')
        print('stick right moved', s['p1']['x']-x0, 'px; attack button while holding stick ->', s['p1']['st'])
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        await ctx.close()
        # ---- phone landscape ----
        ctx=await b.new_context(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg=await ctx.new_page(); hook(pg)
        await pg.goto('file:///home/claude/shadowmon/dist/index.html'); await pg.wait_for_function('window.__shadowmon')
        await pg.touchscreen.tap(422,213); await pg.wait_for_timeout(2600); await pg.screenshot(path=S+'/land.png')
        s=await pg.evaluate(ST); print('phone landscape', {'W':s['W'],'rot':s['rot'],'scene':s['scene']})
        await ctx.close()
        print('errors:', errs)
        await b.close()
asyncio.run(main())
