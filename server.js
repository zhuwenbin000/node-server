const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
var mime = require('./mime'); // 加载我们的mime.js
var config = require('./config');

const port = 3838;

const server =  http.createServer(function(req,res){

  var pathName = url.parse(req.url).pathname;  // 获取文件名"/xxx"

      // 对中文进行解码,防止乱码
      pathName = decodeURI(pathName);
      // 重定向: 考虑定义标准的url,以'/'结尾.
      if(path.extname(pathName) === ''){  // 没有扩展名
        if(pathName.charAt(pathName.length-1) !== '/'){
          pathName += '/';
          var redirect = encodeURI('http://' + req.headers.host + pathName); // 记得encodeURI,不然中文目录报错
          res.writeHead(301,{
            location: redirect
          });
        }
      }

      // 获取资源的绝对路径
      var realFilePath = path.resolve(__dirname+'/static'+ pathName);

      // 获取对应文件的文档类型
      var ext = path.extname(pathName); // 获取后缀名,如'.html'
      ext = ext?ext.slice(1): 'notKnow';  // 取掉.符号
      if (ext.match(config.Expires.fileMatch)) {
          var expires = new Date();
          expires.setTime(expires.getTime() + config.Expires.maxAge * 1000);
          // 设置响应头
          res.setHeader("Expires", expires.toUTCString());
          res.setHeader("Cache-Control", "max-age=" + config.Expires.maxAge);
      }
      // 定义未知文档的类型MIME
      var contentType = mime[ext] || "text/plain"; // 后缀名存在就进行映射,不存在就是'text/plain'

      // 判断文件是否存在
      fs.stat(realFilePath,function(err,stats){
        // err
        if(err){
          // 也可以定制自己的404页面
          res.writeHead(404,{'content-type': 'text/html'});
          res.end('<h3>404 Not Found</h3>');
          return
        }
        // 存在
        if(stats.isFile()){
          res.writeHead(200,{'content-type': contentType});
          // 开始读取文件
          var stream = fs.createReadStream(realFilePath);
          // 读取时候错误处理
          stream.on('error',function(){
            res.writeHead(500,{'content-type': contentType});
          });
          // 返回文件内容
          stream.pipe(res);
        }
        // 路径是目录的情况,列出当前目录下文件
        if(stats.isDirectory() ){

          var html = '<head><meta charset="utf-8"></head>';
          // 读写该目录下的内容 files是文件数组
          fs.readdir(realFilePath,function(err,files){
            if(err){
              console.log('目录文件读取失败');
            }else{
                // console.log('is directory' + files); // test

              for(var i = 0;i < files.length;i++){
                html += "<div><a  href='" + pathName + files[i] + "'>" + files[i] + "</a></div>";
              }
            }
            res.writeHead(200,{'content-type': 'text/html'});
            res.end(html);
          });

        }
      });

}).listen(port,function(){
  console.log('Server running at port:' + port)
});
