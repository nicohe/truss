import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function tempDir(prefix='truss-test-') { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
export function cleanup(dir) { fs.rmSync(dir, { recursive: true, force: true }); }
export function write(root, relative, content='') { const file=path.join(root,relative); fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,content); return file; }
export function mkdir(root, relative) { const dir=path.join(root,relative); fs.mkdirSync(dir,{recursive:true}); return dir; }
