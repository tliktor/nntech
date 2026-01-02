<?php
/**
 * Plugin Name: NNTECH Invoice Data API
 * Plugin URI: https://github.com/tliktor/nntech
 * Description: Provides order data API for NNTECH invoice matching system. Exposes WooCommerce order data via REST API for automated invoice processing.
 * Version: 1.0.0
 * Author: NNTECH
 * Author URI: https://nanotech.co.hu
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: nntech-invoice-api
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Check if WooCommerce is active
if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    add_action('admin_notices', 'nntech_woocommerce_missing_notice');
    return;
}

function nntech_woocommerce_missing_notice() {
    echo '<div class="error"><p><strong>NNTECH Invoice Data API</strong> requires WooCommerce to be installed and active.</p></div>';
}

class NNTechInvoiceAPI {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    public function activate() {
        // Create API key if not exists
        if (!get_option('nntech_api_key')) {
            update_option('nntech_api_key', wp_generate_password(32, false));
        }
        flush_rewrite_rules();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    public function add_admin_menu() {
        add_options_page(
            'NNTECH Invoice API',
            'NNTECH Invoice API',
            'manage_options',
            'nntech-invoice-api',
            array($this, 'admin_page')
        );
    }

    public function admin_page() {
        $api_key = get_option('nntech_api_key');
        $endpoint_url = rest_url('nntech/v1/orders');
        ?>
        <div class="wrap">
            <h1>NNTECH Invoice Data API</h1>
            <table class="form-table">
                <tr>
                    <th scope="row">API Endpoint</th>
                    <td><code><?php echo esc_url($endpoint_url); ?></code></td>
                </tr>
                <tr>
                    <th scope="row">API Key</th>
                    <td><code><?php echo esc_html($api_key); ?></code></td>
                </tr>
                <tr>
                    <th scope="row">Usage</th>
                    <td>
                        <p>Add header: <code>X-API-Key: <?php echo esc_html($api_key); ?></code></p>
                        <p>Parameters: <code>?from_date=2024-01-01&to_date=2024-01-31</code></p>
                    </td>
                </tr>
            </table>
        </div>
        <?php
    }

    public function register_routes() {
        register_rest_route('nntech/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_orders'),
            'permission_callback' => array($this, 'check_permissions'),
        ));
    }

    public function check_permissions($request) {
        $api_key = $request->get_header('X-API-Key');
        $stored_key = get_option('nntech_api_key');
        
        return $api_key && hash_equals($stored_key, $api_key);
    }

    public function get_orders($request) {
        $from_date = $request->get_param('from_date') ?: date('Y-m-01');
        $to_date = $request->get_param('to_date') ?: date('Y-m-t');
        
        $orders = wc_get_orders(array(
            'status' => array('completed', 'processing'),
            'date_created' => $from_date . '...' . $to_date,
            'limit' => -1,
        ));

        $order_data = array();
        foreach ($orders as $order) {
            $order_data[] = array(
                'id' => $order->get_id(),
                'number' => $order->get_order_number(),
                'date' => $order->get_date_created()->format('Y-m-d'),
                'total' => floatval($order->get_total()),
                'currency' => $order->get_currency(),
                'status' => $order->get_status(),
                'customer_email' => $order->get_billing_email(),
                'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'payment_method' => $order->get_payment_method_title(),
            );
        }

        return rest_ensure_response($order_data);
    }
}

new NNTechInvoiceAPI();