Component({

  properties: {
    "labelOn": {
      type: String,
      value: "label-on"
    },
    "labelOff": {
      type: String,
      value: "label-off"
    }
  },

  data: {
    label: "undefined",
    state: "waiting"
  },

  methods: {
    setOn() {
      this.setData({
        label: this.properties.labelOn,
        state: "on"
      })
      clearInterval(this.waitInterval)
    },
    setOff() {
      this.setData({
        label: this.properties.labelOff,
        state: "off"
      })
      clearInterval(this.waitInterval)
    },
    setWait() {
      var vm = this
      vm.setData({
        label: '. . .',
        state: "waiting"
      })

      vm.waitInterval = setInterval(function () {
        let dots = vm.data.label.split('.')
        let ndots = dots.length - 1;
        if (ndots < 3)
          ndots ++
        else
          ndots = 1

        vm.setData({
          label: '. '.repeat(ndots),
          state: "waiting"
        })
      }, 300)
    },
    setThen: async function (promise) {
        this.setWait()
        const state = await promise
        if (state)
          this.setOn()
        else
          this.setOff()
    },
    onTap: function () {
      if (this.data.state !== 'waiting') {
        this.triggerEvent('tap')
      }
    }
  }
})