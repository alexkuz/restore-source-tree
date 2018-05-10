import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import { SourceMapConsumer } from 'source-map';
import { Command } from 'commander';
var list = []

const WEBPACK_PREFIX = 'webpack:///';
const WEBPACK_FOOTER = '// WEBPACK FOOTER //'; // 新版本的webpack注释修改

const program = new Command('restore-source-tree')
  .version('0.1.1')
  .usage('[options] <file>')
  .description('Restores file structure from source map')
  .option('-o, --out-dir [dir]', 'Output directory (\'output\' by default)', 'output')
  .option('-n, --include-node-modules', 'Include source files in node_modules')
  .option('-r, --recursive', 'Recursively search matching files')
  .parse(process.argv);

if (program.args.length === 0) {
  program.outputHelp();
  process.exit(1);
}

const readJson = filename => {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (e) {
    console.error(`Parsing file '${filename}' failed: ${e.message}`);
    process.exit(1);
  }
}

const getSourceList = smc => {
  let sources = smc.sources
    .filter(src => src.startsWith(WEBPACK_PREFIX))
    .map(src => [src.replace(WEBPACK_PREFIX, ''), src])
    .filter(([filePath]) => !filePath.startsWith('(webpack)'));

  if (!program.includeNodeModules) {
    sources = sources.filter(([filePath]) => !filePath.startsWith('~/'));
  }

  return sources;
}

const trimFooter = str => str.substr(0, str.indexOf(WEBPACK_FOOTER)).trimRight() + '\n';

const saveSourceContent = (smc, filePath, src) => {
  const content = trimFooter(smc.sourceContentFor(src));
  const outPath = path.join(program.outDir, filePath);
  const dir = path.dirname(outPath);

  if (content.length < 2) return;

  mkdirp(dir, err => {
    if (err) {
      console.error('Failed creating directory', dir);
      process.exit(1);
    } else {
      // 判断文件存在,用于跳过重复文件
      fs.exists(outPath, function (exists) {
        if (!exists) {
          fs.writeFile(outPath, content, err => {
            if (err) {
              console.error('Failed writing file', outPath);
              process.exit(1);
            }
          });
        } else {
          console.log("跳过重复文件:" + outPath)
        }
      });
    }
  })
}

function processFile(filename) {
  const json = readJson(filename);

  const smc = new SourceMapConsumer(json);

  const sources = getSourceList(smc);

  sources
    .filter(([filePath]) => !/\?[A-Za-z0-9\*]+$/.test(filePath)) // 过滤重复文件
    .forEach(([filePath, src]) => saveSourceContent(smc, filePath, src));

  console.log(`Processed ${sources.length} files`);
}

/**
 * 遍历目录下的map文件
 * @param {*} directory 
 */
function walkDir(directory) {
  var files = []

  var walk = function (directory) {
    fs.readdirSync(directory).forEach(function (file) {
      var fullpath = path.join(directory, file);
      var stat = fs.statSync(fullpath);
      var extname = path.extname(fullpath);
      // 更换windows路径
      fullpath = fullpath.replace(/\\/g, '/')

      if (stat.isFile() && extname === '.map') {
        files.push(fullpath)
      } else if (stat.isDirectory()) {
        var subdir = path.join(directory, file);
        walk(subdir);
      }
    })
  }

  walk(directory)
  return files
}

const filename = program.args[0];

fs.access(filename, err => {
  if (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!program.recursive) {
    processFile(filename);
  } else {
    var files = walkDir(filename)
    files.forEach(file => processFile(file))
  }
});

