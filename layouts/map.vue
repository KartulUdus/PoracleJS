<template>
    <div>
        <no-ssr>
            <vue-drawer-layout
                    ref="drawer"
                    :drawer-width="300"
                    :enable="true"
                    :animatable="true"
                    @slide-start="handleSlideStart"
                    @slide-move="handleSlideMove"
                    @slide-end="handleSlideEnd"
                    @mask-click="handleMaskClick">
                <div class="drawer-content" slot="drawer">
                    <!-- drawer-content -->
                </div>
                <div slot="content">
                    <nuxt/>
                </div>
            </vue-drawer-layout>
        </no-ssr>
    </div>
</template>
