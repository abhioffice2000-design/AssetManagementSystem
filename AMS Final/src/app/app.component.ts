import { Component, OnInit } from '@angular/core';

declare var $: any;

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'ams';

  ngOnInit() {
    console.log('AppComponent initialized. Checking for Cordys SDK...', typeof $, typeof $.cordys);
    
    // Configure Cordys SDK to use the proxy root endpoints (bypassing the default /cordys/ prefix)
    if (typeof $ !== 'undefined' && $.cordys) {
      console.log('Cordys SDK found. Configuring paths...');
      if ($.cordys.authentication && $.cordys.authentication.defaults) {
        $.cordys.authentication.defaults.preLoginInfoURL = "/com.eibus.sso.web.authentication.PreLoginInfo.wcp";
        $.cordys.authentication.defaults.loginURL = "/com.eibus.web.soap.Gateway.wcp";
        console.log('Cordys paths configured.');
      }
      
      // Auto-trigger PreLoginInfo on load to establish Cordys connectivity
      if ($.cordys.authentication) {
        console.log('Triggering getPreloginInfo()...');
        $.cordys.authentication.getPreloginInfo()
          .done((resp: any) => {
            console.log('Cordys PreLoginInfo loaded successfully (Connectivity Established)', resp);
          })
          .fail((err: any) => {
            console.error('Failed to load Cordys PreLoginInfo', err);
          });
      } else {
        console.warn('$.cordys.authentication is undefined');
      }
    } else {
      console.warn('Cordys SDK or jQuery is not loaded properly');
    }
  }
}

