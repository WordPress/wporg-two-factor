<?php

namespace WildWolf\WordPress\TwoFactorWebAuthn;

use MadWizard\WebAuthn\Credential\CredentialId;
use MadWizard\WebAuthn\Credential\UserCredentialInterface;
use MadWizard\WebAuthn\Credential\UserHandle;
use MadWizard\WebAuthn\Crypto\CoseKeyInterface;

class WebAuthn_User_Credential implements UserCredentialInterface {
	private CredentialId $credential_id;
	private CoseKeyInterface $public_key;
	private UserHandle $user_handle;

	public function __construct( CredentialId $credential_id, CoseKeyInterface $public_key, UserHandle $user_handle ) {
		$this->credential_id = $credential_id;
		$this->public_key    = $public_key;
		$this->user_handle   = $user_handle;
	}

	public function getCredentialId(): CredentialId {
		return $this->credential_id;
	}

	public function getPublicKey(): CoseKeyInterface {
		return $this->public_key;
	}

	public function getUserHandle(): UserHandle {
		return $this->user_handle;
	}
}
