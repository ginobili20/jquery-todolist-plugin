# jquery.todolist.plugin

### 简介
一款带有到时提醒功能的 todolist 的jquery插件


### 技术栈
主要使用jquery以及h5的 localStorage

由其使用了jquery的Deferred来解决原生confirm阻塞任务列表的到时提醒功能

### 依赖
```
"devDependencies": {
    "jquery": "^3.4.1",
    "jquery-datetimepicker": "^2.5.4",
    "normalize.css": "^4.2.0",
    "store": "^1.3.20"
  }
```

### 使用方法

1. 放置模板 （样式可以自行修改 提示音也可以按个人喜好引入）
```
div id="container" class="container">
    <h1>TODOLIST</h1>
    <form id="form" style="overflow: hidden">
        <input type="text" class="formText" id="formText" placeholder="e.g. 下午记得买菜" autofocus autocomplete="off">
        <button type="submit" class="formBtn" id="formBtn">提交</button>
    </form>

    <!-- task-list -->
    <div id="task-list" class="task-list">

    </div>

    <div class="task-detail-mask" id="task-detail-mask"></div>
    <!--task-detail-->
    <div class="task-detail" id="task-detail">

    </div>
</div>

<video src="./src/assets/alert.mp3" class="alerter" id="alerter"></video>

```

2.引入依赖

```
    <link rel="stylesheet" href="node_modules/normalize.css/normalize.css">
    <link rel="stylesheet" href="node_modules/jquery-datetimepicker/build/jquery.datetimepicker.min.css">
    <link rel="stylesheet" href="./src/css/index.css">
    
    ...
    
    <script src="node_modules/jquery/dist/jquery.js"></script>
    <script src="node_modules/jquery-datetimepicker/build/jquery.datetimepicker.full.js"></script>
    <script src="node_modules/store/store.js"></script>
    <script src="./src/js/index.js"></script>

```

3.调用插件

```
  var container = $('#container')
    container.TodoList()
```

### 遇到的问题

#### 1.将我们的任务列表保存到哪里？

cookie or localStorage

我最终选择了localStorage

理由如下：

首先localStorage存储容量比cookie大

其次localStorage生命周期几乎是永久的，除非主动删除，否则长期保存在存储中

#### 2.最初任务列表的删除使用的是confirm方法 原生的弹出框 判断用户是否点击了删除

confirm是同步方法 会阻塞其他任务的到时提醒功能

解决办法: 自己编写一个自定义弹出框

既然我使用了jquery那么不妨来试试```$.Deffered()```


#### 为什么要使用Deferred

传统异步编程主要是事件和回调的方式，这样带来了一些问题 深度嵌套 以及 地狱回调

所以我们需要一套更好的规范，也就是promise规范 

promise是一个对象，一个promise可以是三种状态之一，未完成，完成，失败

而jquery的Deferred就满足这个规范


#### jquery的Deferred相关api
```
$.ajax('data/url')
    .done(function(response, statusText, jqXHR){
        console.log(statusText);
    })
    .fail(function(jqXHR, statusText, error){
        console.log(statusText);
    })
    ,always(function(){
        console.log('I will always done.');
    });

```


#### 1.then方法会返回一个新的Deferred对象，多个then连续使用，此功能相当于顺序调用异步回调。

```
$.ajax({
                           url: 't2.html',
                           dataType: 'html',
                           data: {
                              d: 4
                           }
                        }).then(function(){
                            console.log('success');
                        },function(){
                            console.log('failed');
                        }).then(function(){
                            console.log('second');
                            return $.ajax({
                                url: 'jquery-1.9.1.js',
                                dataType: 'script'
                            });
                        }, function(){
                            console.log('second f');
                            return $.ajax({
                                url: 'jquery-1.9.1.js',
                                dataType: 'script'
                            });
                        }).then(function(){
                            console.log('success2');
                        },function(){
                            console.log('failed2');
                        });
```

上面的代码，如果第一个对t2.html的请求成功输出success，就会执行second的ajax请求，接着针对该请求是成功还是失败，执行success2或者failed2。

如果第一个失败输出failed，然后执行second f的ajax请求（注意和上面的不一样），接着针对该请求是成功还是失败，执行success2或者failed2。

理解这些对失败处理很重要。


将我们上面序列化异步操作的代码使用then方法改造后，代码立马变得扁平化了，可读性也增强了：

```
var req1 = $.get('api1/data');
    var req2 = $.get('api2/data');
    var req3 = $.get('api3/data');

    req1.then(function(req1Data){
        return req2.done(otherFunc);
    }).then(function(req2Data){
        return req3.done(otherFunc2);
    }).then(function(req3Data){
        doneSomethingWithReq3();
    });
```


#### 2.when的方法使用，主要是对多个deferred对象进行并行化操作，当所有deferred对象都得到解决就执行后面添加的相应回调(是不是有点像Promise.all()
```
$.when(
        $.ajax({
            
            url: 't2.html'
        
        }),
        $.ajax({
            url: 'jquery-1.9.1-study.js'
        })
    ).then(function(FirstAjaxSuccessCallbackArgs, SecondAjaxSuccessCallbackArgs){
        console.log('success');
    }, function(){
        console.log('failed');
    });
    
 ```
    
  如果有一个失败了都会执行失败的回调。
    
  promse方法是返回的一个promise对象，该对象只能添加回调或者查看状态，但不能触发。我们通常将该方法暴露给外层使用，而内部应该使用deferred来触发回调。
  
  
  #### 封装Deferred
  1.
  ```
  function getData(){
  // 1) create the jQuery Deferred object that will be used
  var deferred = $.Deferred();
  // ---- AJAX Call ---- //
  var xhr = new XMLHttpRequest();
  xhr.open("GET","data",true);
  
  // register the event handler
  xhr.addEventListener('load',function(){
    if(xhr.status === 200){
      // 3.1) RESOLVE the DEFERRED (this will trigger all the done()...)
      deferred.resolve(xhr.response);
    }else{
      // 3.2) REJECT the DEFERRED (this will trigger all the fail()...)
      deferred.reject("HTTP error: " + xhr.status);
    }
  },false) 
  
  // perform the work
  xhr.send();
  // Note: could and should have used jQuery.ajax. 
  // Note: jQuery.ajax return Promise, but it is always a good idea to wrap it
  //       with application semantic in another Deferred/Promise  
  // ---- /AJAX Call ---- //
  
  // 2) return the promise of this deferred
  return deferred.promise();
}
  
  ```
  
  
  
  2.
  
  ```
  function prepareInterface() {   
   return $.Deferred(function( dfd ) {   
       var latest = $( “.news, .reactions” );  
       latest.slideDown( 500, dfd.resolve );  
       latest.addClass( “active” );  
    }).promise();   
}
  
  ```
  
  
 #### Deferred的使用场所：

Ajax（XMLHttpRequest）

Image Tag，Script Tag，iframe（原理类似）

setTimeout/setInterval

CSS3 Transition/Animation

HTML5 Web Database

postMessage

Web Workers

Web Sockets


#### 本插件自定义弹出框使用了Deferred
```
 pop: function (arg) { // 自定义确认弹窗
            var dfd = $.Deferred()
            if (!arg) return
            // 原生alert会停止程序  而这里自定义的不会
            var conf = {}
            if (typeof arg === 'string') {
                conf.title = arg
            } else {
                conf = $.extend(conf, arg)
            }

            this.render_pop(conf)
            this.listen_pop(dfd)

            return dfd.promise()
        }
        
        
        
        ...
        
        var timer = setInterval(function () {//每隔一段时间检查confirm是否被 点击
                if (confirmed !== undefined) {
                    dfd.resolve(confirmed);
                    clearInterval(timer);
                    self.dismiss_pop();
                }
            }, 50)
```


[参考](https://www.cnblogs.com/webFrontDev/p/3265568.html)
