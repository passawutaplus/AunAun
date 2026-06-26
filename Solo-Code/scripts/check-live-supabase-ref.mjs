#!/usr/bin/env node
const url = process.argv[2] || "https://www.solofreelancer.com";
const html = await (await fetch(url)).text();
const jsPath = html.match(/assets\/index-[^"]+\.js/)?.[0];
console.log("site", url);
if (!jsPath) {
  console.log("no index bundle in html");
  process.exit(1);
}
const js = await (await fetch(`${url.replace(/\/$/, "")}/${jsPath}`)).text();
console.log("bundle", jsPath);
console.log("US rvnzjiskqliexysicfmh:", js.includes("rvnzjiskqliexysicfmh"));
console.log("SG zkflkpbmbozrchqncpzi:", js.includes("zkflkpbmbozrchqncpzi"));
