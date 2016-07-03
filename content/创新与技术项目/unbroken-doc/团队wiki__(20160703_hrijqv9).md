## 背景

* 再原有的unbroken-doc方案完全完善之前, 我们采用这个折中的方案进行团队wiki管理
* 本方案是为每一个资源文件 (包括 代码文件/markdown文件/图片文件) 打标签
* 利用标签来跟踪所有的文件结构更改, 并通过命令行更新所有的连接

## 注意事项!!

* 为了在 gitlab 中正常显示图片, 我们必须保证图片路径中没有任何的 特殊字符 (如中文) !!!
    * 链接无此限制
    
## 如何使用

* 下载与环境
    * 确保本地安装了nodejs 和 git
    * `git clone http://gitlab.baidu.com/be-fe/befe-doc.git`
    * 在 befe-doc/ 下, 执行 npm install
* 编辑内容
    * 使用基础为 markdown 语法
    * 但unbroken提供了几个 <span type="link" tag="20160703_rthj1hyl" hash="">[有意思的额外功能](/content/创新与技术项目/unbroken-doc/有意思的额外功能__(20160703_rthj1hyl).md)</span>
*  在 befe-doc 文件夹下, 执行 npm run unbroken

