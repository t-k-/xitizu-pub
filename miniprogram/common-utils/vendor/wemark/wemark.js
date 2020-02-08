const parser = require('./parser');

Component({
    properties: {
      md: {
          type: String,
          value: '',
          observer(){
              this.parseMd();
          }
      }
    },
    data: {
      parsedData: {}
    },
    methods: {
        parseMd(){
			    if (this.data.md) {
            var parsedData = parser.parse(this.data.md, {
              link: true
            });

            console.log(parsedData)

            this.setData({
              parsedData
            });
          }
        }
    }
});
