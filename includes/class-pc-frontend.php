<?php
class PC_Frontend {
    public function __construct() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function enqueue_assets() {
        // Always load theme's product styles
        if (function_exists('wc_get_theme_template_path')) {
            wp_enqueue_style('elessi-product-style', get_template_directory_uri() . '/woocommerce/content-product.css');
        }
        
        wp_enqueue_style('pc-frontend-css', PC_PLUGIN_URL . 'assets/css/frontend.css');
        
        // Load JS if carousel is present on page
        if ($this->has_carousel_shortcode()) {
            wp_enqueue_script('pc-frontend-js', PC_PLUGIN_URL . 'assets/js/frontend.js', ['jquery'], PC_VERSION, true);
            
            wp_localize_script('pc-frontend-js', 'pc_frontend_vars', [
                'plugin_url' => PC_PLUGIN_URL,
                'is_rtl' => is_rtl(),
                'ajax_url' => admin_url('admin-ajax.php')
            ]);
        }
    }

    protected function has_carousel_shortcode() {
        global $post;
        
        // Check main post content
        if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'product_carousel')) {
            return true;
        }
        
        // Check widgets
        if (is_active_widget(false, false, 'text', true)) {
            $widgets = get_option('widget_text');
            foreach ((array)$widgets as $widget) {
                if (isset($widget['text']) && has_shortcode($widget['text'], 'product_carousel')) {
                    return true;
                }
            }
        }
        
        // For AJAX loading
        if (wp_doing_ajax()) {
            return true;
        }
        
        return false;
    }
}