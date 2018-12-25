import Vue from 'vue'
import { Slide } from 'vue-burger-menu'
import { ScaleDown } from 'vue-burger-menu'
import { ScaleRotate } from 'vue-burger-menu'
import { Reveal } from 'vue-burger-menu'
import { Push } from 'vue-burger-menu'
import { PushRotate } from 'vue-burger-menu'
Vue.component('SlideMenu', Slide)
Vue.component('ScaleDownMenu', ScaleDown)
Vue.component('ScaleRotateMenu', ScaleRotate)
Vue.component('RevealMenu', Reveal)
Vue.component('PushMenu', Push)
Vue.component('PushRotateMenu', PushRotate)