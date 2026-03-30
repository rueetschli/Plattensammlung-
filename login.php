<?php
/**
 * login.php – Login-Maske
 */
require_once __DIR__ . '/config/config.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['username'] ?? '');
    $pass = trim($_POST['password'] ?? '');

    if ($user === APP_USERNAME && $pass === APP_PASSWORD) {
        // Cookie 1 Jahr gültig
        setcookie(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, [
            'expires'  => time() + 365 * 24 * 60 * 60,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        header('Location: index.php');
        exit;
    }

    $error = 'Falscher Benutzername oder Passwort.';
}
?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VinylKids Collector – Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="login-body">
    <div class="login-container">
        <div class="login-logo">
            <span class="logo-icon">&#127926;</span>
            <h1 class="neon-title">VinylKids<br><span class="neon-sub">Collector</span></h1>
        </div>

        <?php if ($error): ?>
            <div class="error-msg"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" class="login-form" autocomplete="off">
            <div class="input-group">
                <input type="text" name="username" placeholder="Username" required autofocus>
            </div>
            <div class="input-group">
                <input type="password" name="password" placeholder="Password" required>
            </div>
            <button type="submit" class="btn btn-neon">Login</button>
        </form>
    </div>
</body>
</html>
