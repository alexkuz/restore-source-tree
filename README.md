# restore-source-tree
Restores file structure from source map (only Webpack source map files supported)

## Usage

```sh
> npm i -g restore-source-tree

> restore-source-tree --out-dir <OUT_DIR> <FILE>
```


# 修改内容

* 在原版本的基础上修改了webpack注释导致无法生成文件的问题
* 添加了 `-r` 命令支持第递归目录还原
* 添加了对重复引用文件还原的过滤