<?php
/**
 * Class for creating WebAuthn token
 *
 * @package Two_Factor
 */

/**
 * Class Two_Factor_WebAuthn.
 */
class Two_Factor_WebAuthn extends Two_Factor_Provider {

	/**
	 * The user meta login key.
	 *
	 * @type string
	 */
	const LOGIN_USERMETA = '_two_factor_webauthn_login';

	/**
	 * Handling WebAuthn requests and responses.
	 *
	 * @var WebAuthnHandler
	 */
	protected $webauthn;

	/**
	 * Holding a users keys.
	 *
	 * @var WebAuthnKeyStore
	 */
	protected $key_store;

	/**
	 * Ensures only one instance of this class exists in memory at any one time.
	 *
	 * @return \Two_Factor_WebAuthn
	 */
	public static function get_instance() {
		static $instance;

		if ( ! isset( $instance ) ) {
			$instance = new self();
		}

		return $instance;
	}

	/**
	 * Class constructor.
	 */
	protected function __construct() {

		require_once __DIR__ . '/includes/class-webauthn-handler.php';
		require_once __DIR__ . '/includes/class-cbor-decoder.php';
		require_once __DIR__ . '/includes/class-webauthn-keystore.php';

		$this->webauthn = new WebAuthnHandler( $this->get_app_id() );

		$this->key_store = WebAuthnKeyStore::instance();

		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
		add_action( 'login_enqueue_scripts', array( __CLASS__, 'register_assets' ) );

		add_action( 'wp_ajax_webauthn_preregister', [ $this, 'wp_ajax_webauthn_preregister' ] );
		add_action( 'wp_ajax_webauthn_register', [ $this, 'wp_ajax_webauthn_register' ] );

		// add_action( 'wp_ajax_webauthn-register', array( $this, 'ajax_register' ) );
		add_action( 'wp_ajax_webauthn-edit-key', array( $this, 'ajax_edit_key' ) );
		add_action( 'wp_ajax_webauthn-delete-key', array( $this, 'ajax_delete_key' ) );
		add_action( 'wp_ajax_webauthn-test-key', array( $this, 'ajax_test_key' ) );


		add_action( 'two_factor_user_options_' . __CLASS__, array( $this, 'user_options' ) );

		parent::__construct();

	}

	public static function register_assets( $hook ) {
		wp_register_script(
			'webauthn-login',
			plugins_url( 'webauthn-login.js', __FILE__ ),
			array( 'jquery' ),
			filemtime( __DIR__ . '/webauthn-login.js' ),
			true
		);

		// wp_register_script(
		// 	'webauthn-admin',
		// 	plugins_url( 'webauthn-admin.js', __FILE__ ),
		// 	array( 'jquery' ),
		// 	filemtime( __DIR__ . '/webauthn-admin.js' ),
		// 	true
		// );

		wp_register_script(
			'webauthn-register-key',
			plugins_url( 'profile.js', __FILE__ ),
			array( 'jquery' ),
			filemtime( __DIR__ . '/profile.js' ),
			true
		);

		if ( in_array( $hook, array( 'user-edit.php', 'profile.php' ), true ) ) {
			$user = wp_get_current_user();

			wp_localize_script(
				'webauthn-register-key',
				'tfa_webauthn',
				array(
					'options' => array(), // todo populate w/ getClientOptionsJson()
					 'nonce' => wp_create_nonce( "webauthn-register_key_{$user->ID}" )
				),
			);
		}


		wp_register_style(
			'webauthn-admin',
			plugins_url( 'webauthn-admin.css', __FILE__ ),
			array(),
			filemtime( __DIR__ . '/webauthn-admin.css' )
		);

		wp_register_style(
			'webauthn-login',
			plugins_url( 'webauthn-login.css', __FILE__ ),
			array(),
			filemtime( __DIR__ . '/webauthn-login.css' )
		);
	}

	/**
	 * Return the U2F AppId. WebAuthn requires the AppID
	 * to be the current domain or a suffix of it.
	 *
	 * @return string AppID FQDN
	 */
	public function get_app_id() {

		$url_parts = wp_parse_url( network_site_url() );

		$app_id = $url_parts['host'];

		if ( ! empty( $url_parts['port'] ) ) {
			$app_id = sprintf( '%s:%d', $app_id, $url_parts['port'] );
		}

		/**
		 * Filter the WebAuthn App ID.
		 *
		 * In order for this to work, the App-ID has to be either the current
		 * (sub-)domain or a suffix of it.
		 *
		 * @param string $app_id Domain name acting as relying party ID.
		 */
		return apply_filters( 'two_factor_webauthn_app_id', $app_id );

	}


	/**
	 * Returns the name of the provider.
	 *
	 * @return string
	 */
	public function get_label() {
		return _x( 'Web Authentication (FIDO2)', 'Provider Label', 'two-factor' );
	}

	/**
	 * Prints the form that prompts the user to authenticate.
	 *
	 * @param WP_User $user WP_User object of the logged-in user.
	 * @return null
	 */
	public function authentication_page( $user ) {

		wp_enqueue_style( 'webauthn-login' );

		require_once ABSPATH . '/wp-admin/includes/template.php';

		// WebAuthn  doesn't work without HTTPS.
		if ( ! is_ssl() ) {
			?>
			<p><?php esc_html_e( 'Web Authentication requires an HTTPS connection. Please use an alternative 2nd factor method.', 'two-factor' ); ?></p>
			<?php

			return;
		}

		try {

			$keys = $this->key_store->get_keys( $user->ID );

			$auth_opts = $this->webauthn->prepareAuthenticate( $keys );

			update_user_meta( $user->ID, self::LOGIN_USERMETA, 1 );
		} catch ( Exception $e ) {
			?>
			<p><?php esc_html_e( 'An error occurred while creating authentication data.', 'two-factor' ); ?></p>
			<?php
			return null;
		}

		wp_localize_script(
			'webauthn-login',
			'webauthnL10n',
			array(
				'action'   => 'webauthn-login',
				'payload'  => $auth_opts,
				'_wpnonce' => wp_create_nonce( 'webauthn-login' ),
			)
		);

		wp_enqueue_script( 'webauthn-login' );

		?>
		<p><?php esc_html_e( 'Please authenticate yourself.', 'two-factor' ); ?></p>
		<input type="hidden" name="webauthn_response" id="webauthn_response" />

		<div class="webauthn-retry">
			<p>
				<a href="#" class="webauthn-retry-link button-primary">
					<?php esc_html_e( 'Connect to Authenticator', 'two-factor' ); ?>
				</a>
			</p>
		</div>
		<div class="webauthn-unsupported">
			<p>
				<span class="dashicons dashicons-warning"></span>
				<?php esc_html_e( 'Your Browser does not support WebAuthn.', 'two-factor' ); ?>
				<?php esc_html_e( 'Please use a backup method.', 'two-factor' ); ?>
			</p>
		</div>
		<?php
	}



	/**
	 * Validates the users input token.
	 *
	 * @param WP_User $user WP_User object of the logged-in user.
	 * @return boolean
	 */
	public function validate_authentication( $user ) {

		$credential = json_decode( wp_unslash( $_POST['webauthn_response'] ) ); // PHPCS:ignore WordPress.Security.NonceVerification.Missing

		if ( ! is_object( $credential ) ) {
			return false;
		}

		$keys = $this->key_store->get_keys( $user->ID );

		$auth = $this->webauthn->authenticate( $credential, $keys );

		if ( false === $auth ) {
			return false;
		}
		$auth->last_used = time();
		$this->key_store->save_key( $user->ID, $auth, $auth->md5id );
		delete_user_meta( $user->ID, self::LOGIN_USERMETA );

		return true;
	}

	/**
	 * Whether this Two Factor provider is configured and available for the user specified.
	 *
	 * @param WP_User $user WP_User object of the logged-in user.
	 * @return boolean
	 */
	public function is_available_for_user( $user ) {
		// only works for currently logged in user.
		return (bool) count( $this->key_store->get_keys( $user->ID ) );
	}

	/**
	 * Inserts markup at the end of the user profile field for this provider.
	 *
	 * @param WP_User $user WP_User object of the logged-in user.
	 */
	public function user_options( $user ) {

		wp_enqueue_script( 'webauthn-register-key' );
		wp_enqueue_style( 'webauthn-admin' );

		$challenge = $this->webauthn->prepareRegister( $user->display_name, $user->user_login );

		$create_data = array(
			'action'   => 'webauthn-register',
			'payload'  => $challenge,
			'userId'   => $user->ID,
			'_wpnonce' => wp_create_nonce( 'webauthn-register' ),
		);

		$keys = $this->key_store->get_keys( $user->ID );

		?>
		<p>
			<?php esc_html_e( 'Requires an HTTPS connection. You can configure hardware authenticators like an USB token or your current device with the button below.', 'two-factor' ); ?>
		</p>

		<div class="webauthn-supported webauth-register">
			<button class="button-secondary" id="webauthn-register-key" data-create-options="<?php echo esc_attr( wp_json_encode( $create_data ) ); ?>">
				<?php esc_html_e( 'Register Device', 'two-factor' ); ?>
			</button>
		</div>

		<div class="webauthn-unsupported hidden">
			<p class="description">
				<span class="dashicons dashicons-warning"></span>
				<?php esc_html_e( 'Your Browser does not support WebAuthn.', 'two-factor' ); ?>
			</p>
		</div>

		<ul class="keys" id="webauthn-keys">
			<?php
			foreach ( $keys as $key ) {
				echo wp_kses(
					$this->get_key_item( $key, $user->ID ),
					array(
						'div'    => array(
							'id'       => array(),
							'class'    => array(),
							'tabindex' => array(),
						),
						'ul'     => array(
							'id'    => array(),
							'class' => array(),
						),
						'li'     => array(
							'id'    => array(),
							'class' => array(),
						),
						'strong' => array(
							'id'    => array(),
							'class' => array(),
						),
						'small'  => array(
							'id'    => array(),
							'class' => array(),
						),
						'br'     => array(
							'id'    => array(),
							'class' => array(),
						),
						'em'     => array(
							'id'    => array(),
							'class' => array(),
						),
						'span'   => array(
							'id'          => array(),
							'class'       => array(),
							'data-action' => array(),
							'data-tested' => array(),
							'tabindex'    => array(),
						),
						'a'      => array(
							'id'          => array(),
							'class'       => array(),
							'data-action' => array(),
							'tabindex'    => array(),
							'href'        => array(),
						),
					)
				);
			}
			?>
		</ul>
		<?php
	}

	/**
	 * Registration Ajax Callback.
	 */
	public function ajax_register() {

		check_ajax_referer( 'webauthn-register' );

		if ( ! isset( $_REQUEST['payload'] ) ) {
			// Error couldn't decode.
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request', 'two-factor' ) ) );
		}

		$credential = json_decode( wp_unslash( $_REQUEST['payload'] ) );

		if ( JSON_ERROR_NONE !== json_last_error() ) {
			// Error couldn't decode.
			wp_send_json_error( new WP_Error( 'webauthn', esc_html( json_last_error_msg() ) ) );
		}

		if ( ! is_object( $credential ) ) {
			// Contained some junk.
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid credential', 'two-factor' ) ) );
		}

		// User id.
		if ( isset( $_REQUEST['user_id'] ) ) {
			$user_id = intval( wp_unslash( $_REQUEST['user_id'] ) );
		} else {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request data', 'two-factor' ) ) );
		}
		// Check permissions.
		if ( ! current_user_can( 'edit_users' ) && get_current_user_id() !== $user_id ) {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Not allowed to add key', 'two-factor' ) ) );
		}

		try {
			$key = $this->webauthn->register( $credential, '' );

			if ( false === $key ) {
				wp_send_json_error( new WP_Error( 'webauthn', $this->webauthn->getLastError() ) );
			}
			/* translators: %s webauthn app id (domain) */
			$key->label     = sprintf( esc_html__( 'New Device - %s', 'two-factor' ), $this->get_app_id() );
			$key->md5id     = md5( implode( '', array_map( 'chr', $key->id ) ) );
			$key->created   = time();
			$key->last_used = false;
			$key->tested    = false;

			if ( false !== $this->key_store->key_exists( $key->md5id ) ) {
				wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'Device already Exists', 'two-factor' ) ) );
				exit();
			}

			$this->key_store->create_key( $user_id, $key );

		} catch ( Exception $err ) {
			wp_send_json(
				array(
					'success' => false,
					'error'   => $err->getMessage(),
				)
			);
			return;
		}

		wp_send_json(
			array(
				'success' => true,
				'html'    => $this->get_key_item( $key, $user_id ),
			)
		);
	}

	/**
	 * Edit Key Ajax Callback.
	 */
	public function ajax_edit_key() {

		check_ajax_referer( 'webauthn-edit-key' );

		if ( ! isset( $_REQUEST['payload'] ) ) {
			// Error couldn't decode.
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request', 'two-factor' ) ) );
		}

		$current_user_id = get_current_user_id();

		if ( isset( $_REQUEST['user_id'] ) ) {
			$user_id = intval( wp_unslash( $_REQUEST['user_id'] ) );
		} else {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request data', 'two-factor' ) ) );
		}
		// Not permitted.
		if ( ! current_user_can( 'edit_users' ) && $user_id !== $current_user_id ) {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Operation not permitted', 'two-factor' ) ) );
		}

		$payload = wp_unslash( $_REQUEST['payload'] );

		if ( ! isset( $payload['md5id'], $payload['label'] ) ) {
			wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'Invalid request', 'two-factor' ) ) );
		}
		$new_label = sanitize_text_field( $payload['label'] );

		if ( empty( $new_label ) ) {
			wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'Invalid label', 'two-factor' ) ) );
		}

		$key = $this->key_store->find_key( $user_id, $payload['md5id'] );
		if ( ! $key ) {
			wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'No such key', 'two-factor' ) ) );
		}

		$key->label = $new_label;

		if ( $this->key_store->save_key( $user_id, $key, $payload['md5id'] ) ) {
			wp_send_json(
				array(
					'success' => true,
				)
			);
		}

		wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'Could not edit key', 'two-factor' ) ) );
	}

	/**
	 * Delete Key Ajax Callback.
	 */
	public function ajax_delete_key() {

		check_ajax_referer( 'webauthn-delete-key' );

		if ( ! isset( $_REQUEST['payload'] ) ) {

			// Error couldn't decode.
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request', 'two-factor' ) ) );
		}

		$key_id = wp_unslash( $_REQUEST['payload'] );

		$current_user_id = get_current_user_id();

		if ( isset( $_REQUEST['user_id'] ) ) {
			$user_id = intval( wp_unslash( $_REQUEST['user_id'] ) );
		} else {
			$user_id = $current_user_id;
		}

		// Not permitted.
		if ( ! current_user_can( 'edit_users' ) && $user_id !== $current_user_id ) {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Operation not permitted', 'two-factor' ) ) );
		}

		if ( $this->key_store->delete_key( $user_id, $key_id ) ) {
			wp_send_json(
				array(
					'success' => true,
				)
			);
		}

		wp_send_json_error( new WP_Error( 'webauthn', esc_html__( 'Could not delete key', 'two-factor' ) ) );
	}

	/**
	 * Test Key Ajax Callback.
	 */
	public function ajax_test_key() {

		check_ajax_referer( 'webauthn-test-key' );

		if ( ! isset( $_REQUEST['payload'] ) ) {
			// error couldn't decode.
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request', 'two-factor' ) ) );
		}

		$credential = wp_unslash( $_REQUEST['payload'] );

		$current_user_id = get_current_user_id();

		if ( isset( $_REQUEST['user_id'] ) ) {
			$user_id = intval( wp_unslash( $_REQUEST['user_id'] ) );
		} else {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Invalid request data', 'two-factor' ) ) );
		}

		// Not permitted.
		if ( ! current_user_can( 'edit_users' ) && $user_id !== $current_user_id ) {
			wp_send_json_error( new WP_Error( 'webauthn', __( 'Operation not permitted', 'two-factor' ) ) );
		}

		$keys = $this->key_store->get_keys( $user_id );

		$key = $this->webauthn->authenticate( json_decode( $credential ), $keys );
		// todo madwiz

		if ( false !== $key ) {
			// store key tested state.
			$key->tested = true;
			$this->key_store->save_key( $user_id, $key, $key->md5id );
		}

		wp_send_json(
			array(
				'success' => false !== $key,
				'message' => $this->webauthn->getLastError(),
			)
		);
	}

	/**
	 * Key Row HTML.
	 *
	 * @param object $pub_key Public key as generated by $this->webauthn->register().
	 * @param int    $user_id User ID.
	 * @return string HTML.
	 */
	private function get_key_item( $pub_key, $user_id ) {

		$out = '<li class="webauthn-key">';

		// Info.
		$out .= sprintf(
			'<span class="webauthn-label webauthn-action" data-action="%1$s" tabindex="1">%2$s</span>',
			esc_attr(
				wp_json_encode(
					array(
						'action'   => 'webauthn-edit-key',
						'payload'  => $pub_key->md5id,
						'userId'   => $user_id,
						'_wpnonce' => wp_create_nonce( 'webauthn-edit-key' ),
					)
				)
			),
			esc_html( $pub_key->label )
		);

		$date_format = _x( 'm/d/Y', 'Short date format', 'two-factor' );

		$out .= sprintf(
			'<span class="webauthn-created"><small>%s</small><br />%s</span>',
			__( 'Created:', 'two-factor' ),
			date_i18n( $date_format, $pub_key->created )
		);
		$out .= sprintf(
			'<span class="webauthn-used"><small>%s</small><br />%s</span>',
			__( 'Last used:', 'two-factor' ),
			$pub_key->last_used ? date_i18n( $date_format, $pub_key->last_used ) : esc_html__( '- Never -', 'two-factor' )
		);

		// Actions.
		$out .= sprintf(
			'<a href="#" class="webauthn-action webauthn-action-link -test webauthn-supported" title="%1$s" data-action="%2$s" >
				%1$s
				<span class="dashicons dashicons-yes-alt" data-tested="%3$s"></span>
			</a>',
			esc_html__( 'Test', 'two-factor' ),
			esc_attr(
				wp_json_encode(
					array(
						'action'   => 'webauthn-test-key',
						'payload'  => $this->webauthn->prepareAuthenticate( array( $pub_key ) ),
							// todo change to madwiz
						'userId'   => $user_id,
						'_wpnonce' => wp_create_nonce( 'webauthn-test-key' ),
					)
				)
			),
			$pub_key->tested ? 'tested' : 'untested'
		);
		$out .= sprintf(
			'<a href="#" class="webauthn-action webauthn-action-link -delete webauthn-supported" title="%1$s" data-action="%2$s">
				<span class="dashicons dashicons-trash"></span>
				<span class="screen-reader-text">%1$s</span>
			</a>',
			esc_html__( 'Delete', 'two-factor' ),
			esc_attr(
				wp_json_encode(
					array(
						'action'   => 'webauthn-delete-key',
						'payload'  => $pub_key->md5id,
						'userId'   => $user_id,
						'_wpnonce' => wp_create_nonce( 'webauthn-delete-key' ),
					)
				)
			)
		);
		$out .= '</li>';

		return $out;
	}










	public function wp_ajax_webauthn_preregister(): void {
		// die('x');
		$user = wp_get_current_user();

		wp_send_json_success(
			array(
				'options' => array( 'foo' => 'bar' ),
				'nonce'   => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
			)
		);

		///////////////// end stub


		$user = wp_get_current_user();
		$this->check_registration_nonce( $user );

		try {
			$server   = Utils::create_webauthn_server();
			$settings = Settings::instance();

			$reg_options = RegistrationOptions::createForUser( WebAuthn_User::get_for( $user ) );
			$reg_options->setExcludeExistingCredentials( true );
			$reg_options->setUserVerification( $settings->get_user_verification_requirement() );

			if ( $settings->get_authenticator_attachment() ) {
				$reg_options->setAuthenticatorAttachment( $settings->get_authenticator_attachment() );
			}

			if ( $settings->get_timeout() ) {
				$reg_options->setTimeout( $settings->get_timeout() * 1000 );
			}

			$options = $server->startRegistration( $reg_options );

			$context = $options->getContext();
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize
			update_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META, base64_encode( serialize( $context ) ) );
			wp_send_json_success(
				array(
					'options' => $options->getClientOptionsJson(),
					'nonce'   => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
				)
			);
		} catch ( Throwable $e ) {
			wp_send_json_error( $e->getMessage() );
		}
	}

	/**
	 * @global wpdb $wpdb
	 */
	public function wp_ajax_webauthn_register(): void {
		$user = wp_get_current_user();

		wp_send_json_success(
			array(
				'row'   => '<tr> <td> hello! </td> </tr>',
				'nonce' => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
			)
		);


		///////////////// end stub

		$user = wp_get_current_user();
		$this->check_registration_nonce( $user );

		try {
			$server  = Utils::create_webauthn_server();
			$context = (string) get_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META, true );
			/** @var mixed */
			$context = unserialize( base64_decode( $context ) ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_unserialize
			if ( ! ( $context instanceof RegistrationContext ) ) {
				throw new UnexpectedValueException( __( 'Unable to retrieve the registration context.', 'two-factor-provider-webauthn' ) );
			}

			// We cannot use WordPress sanitization functions here: the credential must not be altered.
			// We validate that `credential` is a string, valid JSON, and decodes to an object (associative array in terms of PHP).
			// If any of the conditions does not hold, we fail the request.
			// The webauthn-server library performs further validation in accordance with the specification.
			// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$credential = $_POST['credential'] ?? null; // Dangerous to sanitize; the code will validate the value
			if ( ! is_string( $credential ) ) {
				throw new InvalidArgumentException( __( 'Bad request.', 'two-factor-provider-webauthn' ) );
			}

			/** @var mixed */
			$credential = json_decode( wp_unslash( $credential ), true, 512, JSON_THROW_ON_ERROR );
			if ( is_array( $credential ) ) {
				$result = $server->finishRegistration(
					JsonConverter::decodeCredential( $credential, 'attestation' ),
					$context
				);

				$name  = Utils::get_post_field_as_string( 'name' );
				$store = new WebAuthn_Credential_Store();
				$key   = $store->save_user_key( $name, $result );
				if ( null === $key ) {
					if ( defined( 'DEBUG_TFPWA' ) && true === constant( 'DEBUG_TFPWA' ) ) {
						/** @var wpdb $wpdb */
						/** @psalm-suppress InvalidGlobal */
						global $wpdb;
						$last_query = $wpdb->last_query;
						$last_error = $wpdb->last_error;

						/** @var string */
						$credential = wp_json_encode(
							array(
								'user_handle'   => $result->getUserHandle()->toString(),
								'credential_id' => $result->getCredentialId()->toString(),
								'public_key'    => $result->getPublicKey()->toString(),
								'counter'       => $result->getSignatureCounter(),
								'name'          => $name ?: __( 'New Key', 'two-factor-provider-webauthn' ),
								'added'         => time(),
								'last_used'     => time(),
								'u2f'           => 0,
							)
						);

						// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
						error_log( sprintf( 'Unable to save the key to the database. Last query: %s, last error: %s, credential: %s', $last_query, $last_error, $credential ) );
						throw new UnexpectedValueException(
							"Unable to save the key to the database.\n"
							. "Last query: {$last_query}\n"
							. "Last error: {$last_error}\n"
							. "Credential: {$credential}"
						);
					}

					throw new UnexpectedValueException( __( 'Unable to save the key to the database.', 'two-factor-provider-webauthn' ) );
				}

				$table = new Key_Table( $user );
				ob_start();
				$table->single_row( (object) $key );
				$row = ob_get_clean();

				wp_send_json_success(
					array(
						'row'   => $row,
						'nonce' => wp_create_nonce( "webauthn-register_key_{$user->ID}" ),
					)
				);
			} else {
				throw new InvalidArgumentException( __( 'Bad request.', 'two-factor-provider-webauthn' ) );
			}
		} catch ( Throwable $e ) {
			wp_send_json_error( $e->getMessage(), 400 );
		} finally {
			delete_user_meta( $user->ID, self::REGISTRATION_CONTEXT_USER_META );
		}
	}

}
