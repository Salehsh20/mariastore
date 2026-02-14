// ── Admin Auth Guard ──
(function () {
    const token = getToken();
    if (!token) { window.location.href = '/admin/'; return; }

    // Verify token
    fetch(`${ADMIN_API}/admin/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
        if (!res.ok) { logout(); return; }
        return res.json();
    }).then(data => {
        if (data && data.admin) {
            const emailEls = document.querySelectorAll('#adminEmail');
            emailEls.forEach(el => el.textContent = data.admin.email);
        }
    }).catch(() => logout());
})();
