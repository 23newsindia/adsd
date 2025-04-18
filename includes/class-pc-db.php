<?php
class PC_DB {
    private static $table_name = 'product_carousels';

    public static function create_tables() {
        global $wpdb;
        $table = $wpdb->prefix . self::$table_name;
        $charset = $wpdb->get_charset_collate();

        // Modify the settings structure in create_tables()
$sql = "CREATE TABLE $table (
    carousel_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    settings LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY  (carousel_id),
    UNIQUE KEY slug (slug)
) $charset;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }

    public static function check_tables() {
        global $wpdb;
        $table = $wpdb->prefix . self::$table_name;
        
        if ($wpdb->get_var("SHOW TABLES LIKE '$table'") != $table) {
            self::create_tables();
        }
    }

    public static function get_carousel($slug) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}product_carousels 
            WHERE slug = %s", 
            $slug
        ));
    }

    public static function get_carousel_by_id($id) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}product_carousels 
            WHERE carousel_id = %d", 
            $id
        ));
    }

    public static function get_all_carousels() {
        global $wpdb;
        return $wpdb->get_results(
            "SELECT carousel_id, name, slug, created_at 
             FROM {$wpdb->prefix}" . self::$table_name . "
             ORDER BY created_at DESC"
        );
    }

    public static function save_carousel($data) {
        global $wpdb;
        
        $defaults = [
            'name' => '',
            'slug' => sanitize_title($data['name']),
            'settings' => json_encode([
                'desktop_columns' => 5,
                'mobile_columns' => 2,
                'visible_mobile' => 2,
                'category' => '',
                'order_by' => 'popular',
                'products_per_page' => 10
            ]),
            'created_at' => current_time('mysql'),
            'updated_at' => current_time('mysql')
        ];
        
        $insert_data = wp_parse_args($data, $defaults);
        
        return $wpdb->insert(
            $wpdb->prefix . 'product_carousels',
            $insert_data
        );
    }

    public static function update_carousel($id, $data) {
        global $wpdb;
        
        $data['updated_at'] = current_time('mysql');
        
        return $wpdb->update(
            $wpdb->prefix . 'product_carousels',
            $data,
            ['carousel_id' => $id]
        );
    }

    public static function delete_carousel($id) {
        global $wpdb;
        return $wpdb->delete(
            $wpdb->prefix . 'product_carousels',
            ['carousel_id' => $id],
            ['%d']
        );
    }
}