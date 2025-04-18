<?php
class PC_Cache {
    public function __construct() {
        add_action('save_post_product', [$this, 'clear_product_cache']);
        add_action('created_product_cat', [$this, 'clear_term_cache']);
        add_action('edited_product_cat', [$this, 'clear_term_cache']);
        add_action('ctd_rule_updated', [$this, 'clear_all_cache']);
    }

    public function clear_product_cache($post_id) {
        $this->clear_all_cache();
    }

    public function clear_term_cache($term_id) {
        $this->clear_all_cache();
    }

    public function clear_all_cache() {
        global $wpdb;
        
        // Clear carousel cache
        $wpdb->query(
            "DELETE FROM $wpdb->options 
             WHERE option_name LIKE '_transient_pc_carousel_%' 
             OR option_name LIKE '_transient_timeout_pc_carousel_%'"
        );
        
        // Clear products cache
        $wpdb->query(
            "DELETE FROM $wpdb->options 
             WHERE option_name LIKE '_transient_pc_products_%' 
             OR option_name LIKE '_transient_timeout_pc_products_%'"
        );
    }
}

// Initialize in main plugin file
new PC_Cache();