const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.addInitScript(()=>{
 window.spoken=[];speechSynthesis.speak=u=>spoken.push(u.text);speechSynthesis.cancel=()=>{};
 });
 await page.goto(process.env.QUIZ_URL || 'http://127.0.0.1:8000');
 await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);
 await page.click('#start-btn');
 assert.ok(['patoka','bus','kyukyusha','shovelcar','dump_car','taxi','hashigosha'].includes(await page.evaluate(()=>questions[0].correct.id)));
 let id=await page.evaluate(()=>questions[0].correct.id);
 await page.locator(`.vehicle-card:not([data-id="${id}"])`).first().click();
 await page.click('#quit-btn');await page.click('#exit-btn');
 assert.ok(await page.locator('#resume-btn').isVisible());
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);
 await page.click('#resume-btn');
 assert.equal(await page.evaluate(()=>questions[0].correct.id),id);
 assert.equal(await page.locator('.vehicle-card.wrong').count(),1);
 await page.click(`[data-id="${id}"]`);
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);
 await page.click('#resume-btn');assert.ok(await page.locator('#correct-overlay').isVisible());
 await page.click('#next-btn');
 assert.equal(await page.locator('.progress-stop.done img').count(),1);
 await page.screenshot({path:'/tmp/kuruma-progress.png',fullPage:true});
 for(let i=1;i<5;i++){id=await page.evaluate(()=>questions[currentIndex].correct.id);await page.click(`[data-id="${id}"]`);await page.click('#next-btn');}
 assert.equal(await page.locator('.collection-vehicle').count(),5);
 await page.locator('.collection-vehicle').first().click();
 assert.equal(await page.evaluate(()=>spoken.at(-1)),await page.evaluate(()=>questions[0].correct.speechName));
 await page.screenshot({path:'/tmp/kuruma-result.png',fullPage:true});
 await page.click('#sound-btn');assert.ok(await page.locator('.collection-vehicle').first().isDisabled());
 await page.click('#home-btn');assert.ok(!await page.locator('#resume-btn').isVisible());
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);
 assert.equal(await page.getAttribute('#sound-btn','aria-pressed'),'true');
 await page.click('#sound-btn');await page.click('#start-btn');
 const vehicles=await page.evaluate(()=>window.eval('vehicles'));
 for(const vehicle of vehicles){
 await page.evaluate(id=>{const v=vehicles.find(v=>v.id===id);questions=[{correct:v,choices:[v,...vehicles.filter(x=>x.id!==id).slice(0,3)]}];currentIndex=0;wrongIds=[];renderQuestion(0)},vehicle.id);
 assert.equal(await page.evaluate(()=>spoken.at(-1)),vehicle.speechName+'は、どこかな？');
 await page.click('#speak-btn');assert.equal(await page.evaluate(()=>spoken.at(-1)),vehicle.speechName+'は、どこかな？');
 }
 await page.evaluate(()=>sessionStorage.setItem('kuruma-session-v1','{"questions":[null]}'));
 await page.reload();await page.waitForFunction(()=>!document.querySelector('#start-btn').disabled);
 assert.ok(!await page.locator('#resume-btn').isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:320,height:640});await page.click('#start-btn');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'speak-btn');
 console.log('PASS: familiar first question; wrong/correct pause+reload; actual collection progress; 5-question finish; collection speech; mute persists; all 63 question/replay texts; invalid restore; 320px layout; keyboard focus. Audible pronunciation not verified.');
 } finally {await browser.close();}
})();
