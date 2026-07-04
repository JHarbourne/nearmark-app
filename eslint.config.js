import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import vuejsA11y from 'eslint-plugin-vuejs-accessibility'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'node_modules/**', '.vite/**', 'supabase/functions/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  ...vuejsA11y.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly' },
    },
    rules: {
      // App.vue / single-name screens are fine
      'vue/multi-word-component-names': 'off',
      // `slot="first"` here is the <img-comparison-slider> WEB COMPONENT slot API,
      // not Vue 2's deprecated slot syntax (which we never use) — so this is off.
      'vue/no-deprecated-slot-attribute': 'off',
      // flag genuinely unused vars; allow intentional _-prefixed args
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // accept either nesting OR explicit for/id association (both are valid WCAG);
      // the rule otherwise demands the control be nested inside the <label>.
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
    },
  },
  {
    // Admin backoffice is now WCAG 2.1 AA-clean too (it's the template others will
    // fork), so these are enforced as errors to prevent regressions — same bar as
    // the public app. label-has-for accepts for/id association as well as nesting.
    files: ['src/admin/**/*.vue'],
    rules: {
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }],
      'vuejs-accessibility/form-control-has-label': 'error',
      'vuejs-accessibility/click-events-have-key-events': 'error',
      'vuejs-accessibility/no-static-element-interactions': 'error',
    },
  },
]
