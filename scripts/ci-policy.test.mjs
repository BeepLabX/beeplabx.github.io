import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

test('only the required Pages artifact is uploaded, retained for one day', () => {
  for (const name of readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name))) {
    assert.doesNotMatch(readFileSync(join('.github/workflows', name), 'utf8'), /actions\/upload-artifact@/i, name);
  }
  const deploy = readFileSync('.github/workflows/deploy.yml', 'utf8');
  assert.match(deploy, /uses: actions\/upload-pages-artifact@v5\s+if: github.event_name != 'pull_request' && github.ref == 'refs\/heads\/main'\s+with:\s+path: dist\/\s+retention-days: 1/);
  assert.match(deploy, /needs: verify/);
  assert.match(deploy, /uses: actions\/deploy-pages@v5/);
});
