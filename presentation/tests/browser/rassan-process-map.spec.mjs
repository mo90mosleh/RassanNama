import{test,expect}from'@playwright/test';
import{backend}from'./pages-backend.mjs';

test.skip(!process.env.PAGES_BASE_PATH,'Pages build only');

test('process map uses the card layout with actual Rassan processes and opens their recorded relations',async({page})=>{
 const data=await backend(page);
 await page.goto('./#/process-map');
 const relation=data.relations[0];
 const origin=data.nodes.find(node=>node.id===relation.source_process_id);
 const destination=data.nodes.find(node=>node.id===relation.target_process_id);
 const parent=data.nodes.find(node=>node.id===origin.parent_id);
 const panel=page.getByRole('region',{name:'فرآیندهای مرتبط'});
 await expect(panel.getByRole('heading',{name:parent.name,exact:true})).toBeVisible();
 await panel.getByRole('button',{name:new RegExp(origin.name)}).click();
 const dialog=page.getByRole('dialog',{name:'جزئیات ارتباط‌های فرآیند'});
 await expect(dialog.getByRole('button',{name:new RegExp(destination.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))})).toBeVisible();
 await dialog.getByRole('button',{name:'بستن جزئیات ارتباط‌ها'}).click();
 await page.getByRole('button',{name:/فرآیندهای بدون ارتباط/}).click();
 await expect(page.getByRole('dialog',{name:'فرآیندهای بدون ارتباط'}).getByRole('button').first()).toBeVisible();
});
