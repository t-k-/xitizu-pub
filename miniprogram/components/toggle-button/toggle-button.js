Component({

  properties: {
    "labelOn": {
      type: String,
      value: "label-on"
    },
    "labelOff": {
      type: String,
      value: "label-off"
    },
    "iconOn": {
      type: String,
      value: null
    },
    "iconOff": {
      type: String,
      value: null
    },
    "oneline": {
      type: Boolean,
      value: false
    },
    "primary": {
      type: Boolean,
      value: false
    },
    "disabled": {
      type: Boolean,
      value: false
    },
    "bindstyle": {
      type: String,
      value: "min-width: 65px"
    }
  },

  data: {
    label: "undefined",
    state: "waiting"
  },

  attached: function () {
    this.setOn()
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
      if (this.data.state !== 'waiting' && !this.properties.disabled) {
        this.triggerEvent('tap', {state: this.data.state})
      }
    }
  }
})