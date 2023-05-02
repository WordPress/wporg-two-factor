(function (jQuery, i18n) {

	function _extends() {
		_extends = Object.assign ? Object.assign.bind() : function (target) {
			for (var i = 1; i < arguments.length; i++) {
				var source = arguments[i];
				for (var key in source) {
					if (Object.prototype.hasOwnProperty.call(source, key)) {
						target[key] = source[key];
					}
				}
			}
			return target;
		};
		return _extends.apply(this, arguments);
	}

	i18n.__('WebAuthn is not supported by the browser.', 'two-factor-provider-webauthn');
	i18n.__('Unable to get a public key credential.', 'two-factor-provider-webauthn');
	var L_NOT_ALLOWED_ERROR = i18n.__('The request is not allowed.', 'two-factor-provider-webauthn');
	var L_SECURITY_ERROR = i18n.__('The operation is insecure.', 'two-factor-provider-webauthn');
	var L_NOT_SUPPORTED_ERROR = i18n.__('The operation is not supported.', 'two-factor-provider-webauthn');
	var L_ABORT_ERROR = i18n.__('The operation was canceled.', 'two-factor-provider-webauthn');
	var L_UNKNOWN_KEY = i18n.__('You cannot use this key to log in.', 'two-factor-provider-webauthn');
	var L_KEY_ALREADY_REGISTERED = i18n.__('This key is already registered.', 'two-factor-provider-webauthn');
	var L_UNKNOWN_ERROR = i18n.__('This key is already registered.', 'two-factor-provider-webauthn');
	var L_FETCHING_REG_INFO = i18n.__('Fetching registration information…', 'two-factor-provider-webauthn');
	var L_GENERATING_CREDENTIALS = i18n.__('Generating credentials…', 'two-factor-provider-webauthn');
	var L_REGISTERING_CREDENTIALS = i18n.__('Registering credentials…', 'two-factor-provider-webauthn');
	var L_FAILED_TO_CREATE_CREDENTIALS = i18n.__('Unable to create public key credentials', 'two-factor-provider-webauthn');
	var L_KEY_REGISTERED = i18n.__('The key has been registered.', 'two-factor-provider-webauthn');
	var L_SENDING_REQUEST = i18n.__('Sending request…', 'two-factor-provider-webauthn');
	var L_KEY_REVOKED = i18n.__('The key has been revoked.', 'two-factor-provider-webauthn');
	var L_KEY_RENAMED = i18n.__('The key has been renamed.', 'two-factor-provider-webauthn');

	function arrayToBase64String(a) {
		return window.btoa(String.fromCharCode.apply(String, a));
	}
	function base64UrlDecode(input) {
		return window.atob(input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(3 - (3 + input.length) % 4));
	}
	function stringToBuffer(s) {
		return Uint8Array.from(s, function (c) {
			return c.charCodeAt(0);
		});
	}
	function preparePublicKeyCreationOptions(publicKey) {
		var _a;
		return _extends({}, publicKey, {
			user: _extends({}, publicKey.user, {
				id: stringToBuffer(base64UrlDecode(publicKey.user.id))
			}),
			challenge: stringToBuffer(base64UrlDecode(publicKey.challenge)),
			excludeCredentials: (_a = publicKey.excludeCredentials) === null || _a === void 0 ? void 0 : _a.map(function (data) {
				return _extends({}, data, {
					id: stringToBuffer(base64UrlDecode(data.id))
				});
			})
		});
	}
	function preparePublicKeyCredential(data) {
		var response = data.response;
		return {
			id: data.id,
			type: data.type,
			rawId: arrayToBase64String(new Uint8Array(data.rawId)),
			clientExtensionResults: data.getClientExtensionResults(),
			response: {
				attestationObject: 'attestationObject' in response ? arrayToBase64String(new Uint8Array(response.attestationObject)) : undefined,
				authenticatorData: 'authenticatorData' in response ? arrayToBase64String(new Uint8Array(response.authenticatorData)) : undefined,
				signature: 'signature' in response ? arrayToBase64String(new Uint8Array(response.signature)) : undefined,
				userHandle: 'userHandle' in response && response.userHandle ? arrayToBase64String(new Uint8Array(response.userHandle)) : undefined,
				clientDataJSON: arrayToBase64String(new Uint8Array(data.response.clientDataJSON))
			}
		};
	}
	function decodeDOMException(e, isAuth) {
		switch (e.name) {
			case 'NotAllowedError':
				return L_NOT_ALLOWED_ERROR;
			case 'SecurityError':
				return L_SECURITY_ERROR;
			case 'NotSupportedError':
				return L_NOT_SUPPORTED_ERROR;
			case 'AbortError':
				return L_ABORT_ERROR;
			case 'InvalidStateError':
				return isAuth ? L_UNKNOWN_KEY : L_KEY_ALREADY_REGISTERED;
			default:
				return e.message;
		}
	}

	/* eslint-disable camelcase */
	function ajaxRequest(data) {
		return new Promise(function (resolve, reject) {
			jQuery.ajax({
				method: 'POST',
				url: ajaxurl,
				data: data
			}).done(function (response) {
				resolve(response);
			}).fail(function (response) {
				var message;
				if (response.responseJSON) {
					message = response.responseJSON.data || L_UNKNOWN_ERROR;
				} else {
					message = response.statusText;
				}
				reject(new Error(message));
			});
		});
	}
	jQuery(function ($) {
		var parent = $('#webauthn-security-keys-section');
		function updateStatus(status) {
			if (!status) {
				parent.find('.security-key-status').text('');
			} else {
				parent.find('.security-key-status').html('<div class="notice notice-info inline"><p>' + status + '</p></div>');
			}
		}
		function errorHandler(e) {
			var message = e instanceof DOMException ? decodeDOMException(e, false) : e.message;
			var table = parent.find('.registered-keys');
			table.siblings('.notice').remove();
			table.before('<div class="notice notice-error inline" role="alert"><p>' + message + '</p></div>');
		}

		function startRegistration( event ) {
			event.preventDefault();

			// const options = JSON.parse( event.target.dataset.createOptions ); // these are generated by mcguffin, so will need to replace w/ volod's
			// console.log(options );

			// todo: might need to re-enable or port these
			// parent.find('.registered-keys').prev('.notice').remove();
			// updateStatus(L_FETCHING_REG_INFO);

			ajaxRequest({
				action: 'webauthn_preregister',	// this is empty wtf, doesn't this need to be `webauthn_preregister`?
				// _ajax`_nonce: options._wpnonce
				_ajax_nonce: tfa_webauthn.nonce
			}).then(function (response) {
				updateStatus(L_GENERATING_CREDENTIALS);
				tfa_webauthn.nonce = response.data.nonce;
				var publicKey = preparePublicKeyCreationOptions(response.data.options);
				return navigator.credentials.create({
					publicKey: publicKey
				});
			}).then(function (c) {
				if (c) {
					updateStatus(L_REGISTERING_CREDENTIALS);
					var name = $('#webauthn-key-name').val();
					return ajaxRequest({
						action: 'webauthn_register',
						_ajax_nonce: tfa_webauthn.nonce,
						credential: JSON.stringify(preparePublicKeyCredential(c)),
						name: name
					});
				}
				throw new Error(L_FAILED_TO_CREATE_CREDENTIALS);
			}).then(function (response) {
				tfa_webauthn.nonce = response.data.nonce;
				var table = parent.find('.registered-keys');
				table.find('tbody > tr:last-child').after(response.data.row);
				table.find('tbody > tr.no-items').remove();
				table.before('<div class="notice notice-success inline" role="alert"><p>' + L_KEY_REGISTERED + '</p></div>');
			})["catch"](errorHandler)["finally"](function () {
				updateStatus('');
				$('#webauthn-key-name').val('');
			});
		}

		// parent.find('.add-webauthn-key button').on('click', startRegistration);
		const registerButton = document.getElementById( 'webauthn-register-key' );
		// console.log( {registerButton} );
		registerButton.addEventListener( 'click', startRegistration );

		parent.find('.registered-keys').on('click', 'tbody .delete a', function (e) {
			parent.find('.registered-keys').prev('.notice').remove();
			e.preventDefault();
			var a = $(e.target);
			var actions = a.closest('.row-actions');
			if (actions.siblings('.confirm-revoke').length) {
				return;
			}
			var handle = a.data('handle');
			var nonce = a.data('nonce');
			var table = parent.find('.registered-keys');
			var tpl = $($('#webauthn-revoke-confirm').text());
			actions.after(tpl);
			actions.siblings('.confirm-revoke').on('click', '.button-secondary', function () {
				actions.siblings('.confirm-revoke').remove();
			}).on('click', '.button-link-delete', function () {
				actions.siblings('.confirm-revoke').hide();
				updateStatus(L_SENDING_REQUEST);
				return ajaxRequest({
					action: 'webauthn_delete_key',
					_ajax_nonce: nonce,
					handle: handle
				}).then(function () {
					table.before('<div class="notice notice-success inline" role="alert"><p>' + L_KEY_REVOKED + '</p></div>');
					a.closest('tr').remove();
					if (!table.find('tbody > tr').length) {
						table.find('tbody').append($('#webauthn-no-keys').text());
					}
				})["catch"](errorHandler)["finally"](function () {
					updateStatus('');
					actions.siblings('.confirm-revoke').remove();
				});
			});
		});
		parent.find('.registered-keys').on('click', 'tbody .rename a', function (e) {
			parent.find('.registered-keys').prev('.notice').remove();
			e.preventDefault();
			var a = $(e.target);
			var actions = a.closest('.row-actions');
			if (actions.siblings('.rename-key').length) {
				return;
			}
			var handle = a.data('handle');
			var nonce = a.data('nonce');
			var name = a.closest('td').find('span.key-name').text().trim();
			var table = parent.find('.registered-keys');
			var tpl = $($('#webauthn-rename-key').text());
			actions.after(tpl);
			actions.siblings('.rename-key').on('click', '.button-secondary', function () {
				actions.siblings('.rename-key').remove();
			}).on('click', '.button-primary', function () {
				var keyname = actions.siblings('.rename-key').find('input[type="text"]').val();
				actions.siblings('.rename-key').hide();
				updateStatus(L_SENDING_REQUEST);
				return ajaxRequest({
					action: 'webauthn_rename_key',
					_ajax_nonce: nonce,
					handle: handle,
					name: keyname
				}).then(function (r) {
					table.before('<div class="notice notice-success inline" role="alert"><p>' + L_KEY_RENAMED + '</p></div>');
					a.closest('td').find('span.key-name').text(r.data.name);
				})["catch"](errorHandler)["finally"](function () {
					updateStatus('');
					actions.siblings('.rename-key').remove();
				});
			}).find('input[type="text"]').val(name);
		});
	});

})(jQuery, wp.i18n);
