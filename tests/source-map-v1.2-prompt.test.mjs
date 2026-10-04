import assert from 'node:assert/strict';
import fs from 'node:fs';

const prompt = fs.readFileSync('prompts/canary/source-map.v1.md', 'utf8');

assert.match(prompt, /Version:\s*1\.2/);
assert.match(prompt, /source-map\/0\.1/);
assert.match(prompt, /source\.txt.*first line as line 1/s);
assert.match(prompt, /Do not count prompt,\s*schema, wrapper, or bootstrap lines/s);
assert.match(prompt, /Never use\s+`stage-input-source-map\.txt`/);
assert.match(prompt, /zero-based character offsets within `source\.txt` only/s);
assert.match(prompt, /named historical people, dates, discoveries, institutions, awards, prizes/s);
assert.match(prompt, /Nobel award or a physics award/);
assert.match(prompt, /put every named person, award or prize, field, date\/year.*into `keyTerms`/s);
assert.match(prompt, /needs-cross-source-check/);
assert.match(prompt, /Keep the source's spelling and competing ASR variants/);
assert.match(prompt, /evidence-navigation layer/);
assert.match(prompt, /not a lesson summary, textbook rewrite/);

console.log('source-map v1.2 prompt regression checks passed');
