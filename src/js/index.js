;(function ($, window, document, undefined) {
    var pluginName = 'TodoList';
    var defaults = {
        form: '#form',
        formText: '#formText',
        taskList: '#task-list',
        taskDetail: '#task-detail',
        taskDetailMask: '#task-detail-mask',
        msg: '#msg',
        msgContent: '#msg-content',
        confirmed: '#confirmed',
        alerter: '#alerter',
        body: 'body',
    };


    function TodoList(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options)
        this._defaults = defaults
        this._name = pluginName
        this.version = 'v1.0.0'

        this.form = $(this.settings.form)
        this.formText = $(this.settings.formText)

        this.taskList = $(this.settings.taskList)

        this.taskDetail = $(this.settings.taskDetail)
        this.taskDetailMask = $(this.settings.taskDetailMask)

        this.msg = $(this.settings.msg)
        this.msgContent = $(this.settings.msgContent)
        this.confirmed = $(this.settings.confirmed)
        this.alerter = $(this.settings.alerter)

        this.body = $(this.settings.body)
        this.window = $(window)

        this.task_list = []
        this.new_task = {}
        //当前显示的任务详情
        this.currentIndex = 0

        //初始化
        this.init()
    }


    TodoList.prototype = {
        init: function () {
            this.task_list = store.get('task_list') || []
            if (this.task_list.length) {
                this.render_task_list()
            }
            this.bindEvent()
        },
        bindEvent: function () {
            var self = this
            this.form.on('submit', function (e) {
                self.new_task = {}
                e.preventDefault()
                self.new_task.content = self.formText.val()
                if (!self.new_task.content) return
                if (self.addTask(self.new_task)) {
                    self.formText.val(null)
                }
            })

            // 轮询 现在时间是否是预定时间
            this.task_remind_check()

            // 监听确认点击事件
            this.listen_msg_confirmed()

        },
        addTask: function (new_task) { // 将new_task放入task_list
            this.task_list.push(new_task);
            this.refresh_task_list()
            return true
        },
        refresh_task_list: function () { // 存入localStorage
            store.set('task_list', this.task_list)
            this.render_task_list()
        },
        render_task_list: function () { // 绘制task_list
            this.taskList.html('')
            var complete_items = [] // 已完成的任务

            // 遍历  task_list 分为完成和未完成分开渲染
            for (var i = 0; i < this.task_list.length; i++) {
                // var $task = this.render_task_item(this.task_list[i], i)
                var item = this.task_list[i]
                if (item && item.complete) {
                    complete_items.push([item, i])
                } else {
                    var $task = this.render_task_item(item, i)
                }
                this.taskList.prepend($task)
            }
            // 遍历完成列表
            for (var j = 0; j < complete_items.length; j++) {
                var $complete = this.render_task_item(complete_items[j][0], complete_items[j][1])
                $complete.addClass('completed')
                this.taskList.append($complete)
            }

            // 重新render后重新监听 解决只监听一次的问题
            this.listen_task_list()  // 对模板事件监听
        },
        render_task_item: function (data, index) { // task_item 模板
            // 不写！index是因为 index有等于0的情况
            if (!data || index == null) return
            var template = '<div class="task-item" data-index="'+ index + '">' +
                '<span><input class="complete" type="checkbox" '+ (data.complete ? 'checked': '') + ' ></span>' +
                '<span class="task-content">' + data.content + '</span>' +
                '<span class="fr">' +
                '<span class="action delete"> 删除</span>' +
                '<span class="action detail"> 详情</span>' +
                '</span>' +
                '</div>'

            return $(template)
        },
        listen_task_list: function () {
            this.listen_task_delete()
            this.listen_task_detail()
            this.listen_task_complete()
        },
        listen_task_delete: function () {
            var $delete = $('.action.delete')
            var self = this;
            $delete.on('click', function (e) {
                var $this = $(this)
                var $item = $this.parent().parent()
                var index = $item.data('index') // 获取index
                var tmp = self.pop('确认删除？').then(function (r) {
                    r ? self.delete_task_list(index) : null
                })
                // 原生弹出框
                // var tmp = confirm('确认删除？')
               // tmp ? self.delete_task_list(index) : null
            })
        },
        delete_task_list: function (index) {
            if (index == null || !this.task_list[index]) return
            delete this.task_list[index]
            this.refresh_task_list()
        },

        listen_task_detail: function () {
            var $detail = $('.action.detail')
            var self = this
            $detail.on('click', function (e) {
                var $this = $(this)
                var $item = $this.parent().parent()
                var index = $item.data('index')
                self.show_task_detail(index)
            })
            this.taskDetailMask.on('click', function (e) {
                self.hide_task_detail()
            })
        },
        show_task_detail: function (index) {
            this.render_task_detail(index)
            this.currentIndex = index
            this.taskDetail.show()
            this.taskDetailMask.show()
        },
        render_task_detail: function (index) {
            var item = this.task_list[index]
            var self = this;
            if (index == null || !item) return
            var template = '<form id="detail-form">' +
                '<div class="content" id="content">' + (item.content || '空标题')  +  '</div>' +
                '<div id="hidden_input" style="display:none;">' +
                '<input type="text" style="width: 100%;" name="content" value="' + item.content  +'">' +
                '</div>' +
                '<div class="input-item desc">' +
                '<textarea class="detail-textarea" name="detail">' + (item.desc || '') +'</textarea>' +
                '</div>' +
                '<div class="input-item remind">' +
                '<label>预约时间</label>' +
                '<input class="detail-time" name="remind" type="text" autocomplete="off" value="' + (item.remind_date || '')  +'">' +
                '</div>'  +
                '<div class="input-item">' +
                '<button class="detail-btn" type="submit">' + '更新' + '</button>' +
                '</div>' +
                '</form>'

            this.taskDetail.html('')
            this.taskDetail.html(template)
            // 使用第三方datepicker插件
            $('.detail-time').datetimepicker()

            $('#detail-form').on('submit', function (e) {
                e.preventDefault();
                var $this = $(this)
                var data = {} // 更新后的对象
                data.content = $this.find('[name=content]').val()
                data.desc = $(this).find('[name=detail]').val()
                data.remind_date = $(this).find('[name=remind]').val()
                self.update_task(index, data)
            })

            $('#content').on('dblclick', function (e) {
                $('#hidden_input').show()
            })
        },
        update_task: function (index, data) {
            if (index == null || !this.task_list[index]) return
            this.task_list[index] = $.extend({}, this.task_list[index], data)
            this.refresh_task_list()
        },
        hide_task_detail: function () {
          this.taskDetail.hide()
          this.taskDetailMask.hide()
        },
        listen_task_complete: function () {
            var $complete_checkbox = $('.task-item .complete');
            var self = this
            $complete_checkbox.on('click', function () {
                var index = $(this).parent().parent().data('index')
                var item = store.get('task_list')[index]
                if (item.complete) {
                    self.update_task(index, {complete: false})
                } else {
                    self.update_task(index, {complete: true})
                }
            })
        },
        task_remind_check: function () {
            var currentTime, taskTime
            var self = this
            var it1 = setInterval(function () {
                for (var i = 0; i < self.task_list.length; i++) {
                    var item = store.get('task_list')[i]
                    if (!item || !item.remind_date || item.informed){
                        continue
                    }
                    currentTime = new Date().getTime();
                    taskTime = new Date(item.remind_date).getTime()
                    if (currentTime - taskTime>= 1) {
                        self.update_task(i, {informed: true})
                        self.show_msg(item.content)
                    }
                }
            }, 300)
        },
        show_msg: function (msg) {
            if (!msg) return
            this.msgContent.html(msg)
            this.alerter[0].play()
            this.msg.show()
        },
        listen_msg_confirmed: function () {
            var self = this
            this.confirmed.on('click', function () {
                self.hide_msg()
            })
        },
        hide_msg: function () {
            this.msg.hide()
        },
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
        },
        render_pop: function (conf) {
            var box = $(
                '<div class="pop-mask" id="pop-mask"></div>' +
                '<div class="pop" id="pop">' +
                '<div class="pop-title" id="pop-title">' +  conf.title + '</div>' +
                '<div class="pop-content">' +
                '<button style="margin-right: 5px;" class="primary confirm">确认</button>' +
                '<button class="primary cancel">取消</button>' +
                '</div>' +
                '</div>')

            box.appendTo(this.body)
        },
        listen_pop: function (dfd) {
            var confirmed
            var self = this
            var timer = setInterval(function () {//每隔一段时间检查confirm是否被 点击
                if (confirmed !== undefined) {
                    dfd.resolve(confirmed);
                    clearInterval(timer);
                    self.dismiss_pop();
                }
            }, 50)

            var $mask = $('#pop-mask')
            var $confirm = $('#pop .confirm')
            var $cancel = $('#pop .cancel')


            $mask.on('click', function (e) {
                confirmed = false
            })

            $confirm.on('click', function () {
                confirmed = true
            })

            $cancel.on('click', function () {
                confirmed = false
            })

            this.window.on('resize', function () {
                self.adjust_pop_position()
            })
            self.adjust_pop_position() // 解决用户第一次点击弹出框 没有调整窗口时窗口位置错误的问题
        },
        dismiss_pop: function () {
            var $mask = $('#pop-mask')
            var $pop = $('#pop')
            $mask.remove()
            $pop.remove()
        },
        adjust_pop_position: function () {
            var window_w = this.window.width(),
                window_h = this.window.height(),
                $pop = $('#pop'),
                box_w = $pop.width(),
                box_h = $pop.height(),
                move_x,
                move_y
            move_x = (window_w - box_w) / 2
            move_y = (window_h - box_h) / 2 - 20

            $pop.css({
                left: move_x,
                top: move_y
            })
        }
    }

    $.fn[pluginName] = function (opts) {
        this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new TodoList(this, opts))
            }
        })
    }
}(jQuery, window, document))