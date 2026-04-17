(function (global) {
  const SCRIPT_SRC = document.currentScript && document.currentScript.src;
  const API = SCRIPT_SRC ? new URL('.', SCRIPT_SRC).href.replace(/\/$/, '') : '';
  const ALLOWED_PARAMS = ['portal', 'avatar_url', 'username', 'ref'];

  const Portals = {
    // Intentionally no TTL — the page reloads on portal navigation anyway.
    // Long-lived sessions will use stale data if the registry changes mid-session.
    _cache: null,

    async load() {
      if (this._cache) return this._cache;
      const res = await fetch(API + '/portals.json');
      this._cache = await res.json();
      return this._cache;
    },

    ref() {
      var params = new URLSearchParams(window.location.search);
      return params.get('ref') || null;
    },

    back() {
      var ref = this.ref();
      if (!ref) {
        console.error('No ref parameter found — nowhere to go back to');
        return;
      }
      window.location.href = ref;
    },

    async enter(slug, params) {
      params = params || {};
      const portals = await this.load();
      const portal = portals.find(function (p) { return p.slug === slug; });
      if (!portal) {
        console.error('Portal not found: ' + slug);
        return;
      }

      var url = new URL(portal.url);
      url.searchParams.set('portal', 'true');
      url.searchParams.set('ref', window.location.href);

      // Auto-resolve avatar from the source game's registry entry if not explicit
      if (!params.avatar_url) {
        var hostname = window.location.hostname;
        var sourceSlug = hostname.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
        var sourcePortal = portals.find(function (p) { return p.slug === sourceSlug; });
        if (sourcePortal && sourcePortal.avatarUrl) {
          params.avatar_url = sourcePortal.avatarUrl;
        }
      }

      for (var key in params) {
        if (ALLOWED_PARAMS.indexOf(key) !== -1) {
          url.searchParams.set(key, params[key]);
        }
      }

      window.location.href = url.toString();
    }
  };

  global.Portals = Portals;
})(window);
