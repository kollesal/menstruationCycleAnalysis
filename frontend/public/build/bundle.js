
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$1() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop$1;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop$1,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop$1;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop$1;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop$1) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop$1;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop$1;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop$1;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.55.1 */

    const { Error: Error_1, Object: Object_1, console: console_1$1 } = globals;

    // (267:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(267:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (260:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(260:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    function restoreScroll(state) {
    	// If this exists, then this is a back navigation: restore the scroll position
    	if (state) {
    		window.scrollTo(state.__svelte_spa_router_scrollX, state.__svelte_spa_router_scrollY);
    	} else {
    		// Otherwise this is a forward navigation: scroll to top
    		window.scrollTo(0, 0);
    	}
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && (event.state.__svelte_spa_router_scrollY || event.state.__svelte_spa_router_scrollX)) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			restoreScroll(previousScrollState);
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		restoreScroll,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // user 
    const base_url = writable({});
    //base_url.set('http://127.0.0.1:5000')
    base_url.set('https://kollesal.pythonanywhere.com');

    function bind(fn, thisArg) {
      return function wrap() {
        return fn.apply(thisArg, arguments);
      };
    }

    // utils is a library of generic helper functions non-specific to axios

    const {toString} = Object.prototype;
    const {getPrototypeOf} = Object;

    const kindOf = (cache => thing => {
        const str = toString.call(thing);
        return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(Object.create(null));

    const kindOfTest = (type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type
    };

    const typeOfTest = type => thing => typeof thing === type;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     *
     * @returns {boolean} True if value is an Array, otherwise false
     */
    const {isArray} = Array;

    /**
     * Determine if a value is undefined
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    const isUndefined = typeOfTest('undefined');

    /**
     * Determine if a value is a Buffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    const isArrayBuffer = kindOfTest('ArrayBuffer');


    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      let result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a String, otherwise false
     */
    const isString = typeOfTest('string');

    /**
     * Determine if a value is a Function
     *
     * @param {*} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    const isFunction = typeOfTest('function');

    /**
     * Determine if a value is a Number
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Number, otherwise false
     */
    const isNumber = typeOfTest('number');

    /**
     * Determine if a value is an Object
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an Object, otherwise false
     */
    const isObject = (thing) => thing !== null && typeof thing === 'object';

    /**
     * Determine if a value is a Boolean
     *
     * @param {*} thing The value to test
     * @returns {boolean} True if value is a Boolean, otherwise false
     */
    const isBoolean = thing => thing === true || thing === false;

    /**
     * Determine if a value is a plain Object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a plain Object, otherwise false
     */
    const isPlainObject = (val) => {
      if (kindOf(val) !== 'object') {
        return false;
      }

      const prototype = getPrototypeOf(val);
      return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
    };

    /**
     * Determine if a value is a Date
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Date, otherwise false
     */
    const isDate = kindOfTest('Date');

    /**
     * Determine if a value is a File
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFile = kindOfTest('File');

    /**
     * Determine if a value is a Blob
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    const isBlob = kindOfTest('Blob');

    /**
     * Determine if a value is a FileList
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a File, otherwise false
     */
    const isFileList = kindOfTest('FileList');

    /**
     * Determine if a value is a Stream
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    const isStream = (val) => isObject(val) && isFunction(val.pipe);

    /**
     * Determine if a value is a FormData
     *
     * @param {*} thing The value to test
     *
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    const isFormData = (thing) => {
      const pattern = '[object FormData]';
      return thing && (
        (typeof FormData === 'function' && thing instanceof FormData) ||
        toString.call(thing) === pattern ||
        (isFunction(thing.toString) && thing.toString() === pattern)
      );
    };

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    const isURLSearchParams = kindOfTest('URLSearchParams');

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     *
     * @returns {String} The String freed of excess whitespace
     */
    const trim = (str) => str.trim ?
      str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     *
     * @param {Boolean} [allOwnKeys = false]
     * @returns {any}
     */
    function forEach(obj, fn, {allOwnKeys = false} = {}) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      let i;
      let l;

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
        const len = keys.length;
        let key;

        for (i = 0; i < len; i++) {
          key = keys[i];
          fn.call(null, obj[key], key, obj);
        }
      }
    }

    function findKey(obj, key) {
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while (i-- > 0) {
        _key = keys[i];
        if (key === _key.toLowerCase()) {
          return _key;
        }
      }
      return null;
    }

    const _global = (() => {
      /*eslint no-undef:0*/
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
    })();

    const isContextDefined = (context) => !isUndefined(context) && context !== _global;

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     *
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      const {caseless} = isContextDefined(this) && this || {};
      const result = {};
      const assignValue = (val, key) => {
        const targetKey = caseless && findKey(result, key) || key;
        if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
          result[targetKey] = merge(result[targetKey], val);
        } else if (isPlainObject(val)) {
          result[targetKey] = merge({}, val);
        } else if (isArray(val)) {
          result[targetKey] = val.slice();
        } else {
          result[targetKey] = val;
        }
      };

      for (let i = 0, l = arguments.length; i < l; i++) {
        arguments[i] && forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     *
     * @param {Boolean} [allOwnKeys]
     * @returns {Object} The resulting value of object a
     */
    const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
      forEach(b, (val, key) => {
        if (thisArg && isFunction(val)) {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      }, {allOwnKeys});
      return a;
    };

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     *
     * @returns {string} content value without BOM
     */
    const stripBOM = (content) => {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    };

    /**
     * Inherit the prototype methods from one constructor into another
     * @param {function} constructor
     * @param {function} superConstructor
     * @param {object} [props]
     * @param {object} [descriptors]
     *
     * @returns {void}
     */
    const inherits = (constructor, superConstructor, props, descriptors) => {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, 'super', {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    };

    /**
     * Resolve object with deep prototype chain to a flat object
     * @param {Object} sourceObj source object
     * @param {Object} [destObj]
     * @param {Function|Boolean} [filter]
     * @param {Function} [propFilter]
     *
     * @returns {Object}
     */
    const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};

      destObj = destObj || {};
      // eslint-disable-next-line no-eq-null,eqeqeq
      if (sourceObj == null) return destObj;

      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

      return destObj;
    };

    /**
     * Determines whether a string ends with the characters of a specified string
     *
     * @param {String} str
     * @param {String} searchString
     * @param {Number} [position= 0]
     *
     * @returns {boolean}
     */
    const endsWith = (str, searchString, position) => {
      str = String(str);
      if (position === undefined || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };


    /**
     * Returns new array from array like object or null if failed
     *
     * @param {*} [thing]
     *
     * @returns {?Array}
     */
    const toArray = (thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    };

    /**
     * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
     * thing passed in is an instance of Uint8Array
     *
     * @param {TypedArray}
     *
     * @returns {Array}
     */
    // eslint-disable-next-line func-names
    const isTypedArray = (TypedArray => {
      // eslint-disable-next-line func-names
      return thing => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

    /**
     * For each entry in the object, call the function with the key and value.
     *
     * @param {Object<any, any>} obj - The object to iterate over.
     * @param {Function} fn - The function to call for each entry.
     *
     * @returns {void}
     */
    const forEachEntry = (obj, fn) => {
      const generator = obj && obj[Symbol.iterator];

      const iterator = generator.call(obj);

      let result;

      while ((result = iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    };

    /**
     * It takes a regular expression and a string, and returns an array of all the matches
     *
     * @param {string} regExp - The regular expression to match against.
     * @param {string} str - The string to search.
     *
     * @returns {Array<boolean>}
     */
    const matchAll = (regExp, str) => {
      let matches;
      const arr = [];

      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }

      return arr;
    };

    /* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
    const isHTMLForm = kindOfTest('HTMLFormElement');

    const toCamelCase = str => {
      return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
        function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
        }
      );
    };

    /* Creating a function that will check if an object has a property. */
    const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

    /**
     * Determine if a value is a RegExp object
     *
     * @param {*} val The value to test
     *
     * @returns {boolean} True if value is a RegExp object, otherwise false
     */
    const isRegExp = kindOfTest('RegExp');

    const reduceDescriptors = (obj, reducer) => {
      const descriptors = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};

      forEach(descriptors, (descriptor, name) => {
        if (reducer(descriptor, name, obj) !== false) {
          reducedDescriptors[name] = descriptor;
        }
      });

      Object.defineProperties(obj, reducedDescriptors);
    };

    /**
     * Makes all methods read-only
     * @param {Object} obj
     */

    const freezeMethods = (obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        // skip restricted props in strict mode
        if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
          return false;
        }

        const value = obj[name];

        if (!isFunction(value)) return;

        descriptor.enumerable = false;

        if ('writable' in descriptor) {
          descriptor.writable = false;
          return;
        }

        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error('Can not rewrite read-only method \'' + name + '\'');
          };
        }
      });
    };

    const toObjectSet = (arrayOrString, delimiter) => {
      const obj = {};

      const define = (arr) => {
        arr.forEach(value => {
          obj[value] = true;
        });
      };

      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

      return obj;
    };

    const noop = () => {};

    const toFiniteNumber = (value, defaultValue) => {
      value = +value;
      return Number.isFinite(value) ? value : defaultValue;
    };

    const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

    const DIGIT = '0123456789';

    const ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };

    const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
      let str = '';
      const {length} = alphabet;
      while (size--) {
        str += alphabet[Math.random() * length|0];
      }

      return str;
    };

    /**
     * If the thing is a FormData object, return true, otherwise return false.
     *
     * @param {unknown} thing - The thing to check.
     *
     * @returns {boolean}
     */
    function isSpecCompliantForm(thing) {
      return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
    }

    const toJSONObject = (obj) => {
      const stack = new Array(10);

      const visit = (source, i) => {

        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }

          if(!('toJSON' in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};

            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });

            stack[i] = undefined;

            return target;
          }
        }

        return source;
      };

      return visit(obj, 0);
    };

    var utils = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      ALPHABET,
      generateString,
      isSpecCompliantForm,
      toJSONObject
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     *
     * @returns {Error} The created error.
     */
    function AxiosError(message, code, config, request, response) {
      Error.call(this);

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = (new Error()).stack;
      }

      this.message = message;
      this.name = 'AxiosError';
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      response && (this.response = response);
    }

    utils.inherits(AxiosError, Error, {
      toJSON: function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils.toJSONObject(this.config),
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      }
    });

    const prototype$1 = AxiosError.prototype;
    const descriptors = {};

    [
      'ERR_BAD_OPTION_VALUE',
      'ERR_BAD_OPTION',
      'ECONNABORTED',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_FR_TOO_MANY_REDIRECTS',
      'ERR_DEPRECATED',
      'ERR_BAD_RESPONSE',
      'ERR_BAD_REQUEST',
      'ERR_CANCELED',
      'ERR_NOT_SUPPORT',
      'ERR_INVALID_URL'
    // eslint-disable-next-line func-names
    ].forEach(code => {
      descriptors[code] = {value: code};
    });

    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

    // eslint-disable-next-line func-names
    AxiosError.from = (error, code, config, request, response, customProps) => {
      const axiosError = Object.create(prototype$1);

      utils.toFlatObject(error, axiosError, function filter(obj) {
        return obj !== Error.prototype;
      }, prop => {
        return prop !== 'isAxiosError';
      });

      AxiosError.call(axiosError, error.message, code, config, request, response);

      axiosError.cause = error;

      axiosError.name = error.name;

      customProps && Object.assign(axiosError, customProps);

      return axiosError;
    };

    // eslint-disable-next-line strict
    var httpAdapter = null;

    /**
     * Determines if the given thing is a array or js object.
     *
     * @param {string} thing - The object or array to be visited.
     *
     * @returns {boolean}
     */
    function isVisitable(thing) {
      return utils.isPlainObject(thing) || utils.isArray(thing);
    }

    /**
     * It removes the brackets from the end of a string
     *
     * @param {string} key - The key of the parameter.
     *
     * @returns {string} the key without the brackets.
     */
    function removeBrackets(key) {
      return utils.endsWith(key, '[]') ? key.slice(0, -2) : key;
    }

    /**
     * It takes a path, a key, and a boolean, and returns a string
     *
     * @param {string} path - The path to the current key.
     * @param {string} key - The key of the current object being iterated over.
     * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
     *
     * @returns {string} The path to the current key.
     */
    function renderKey(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(function each(token, i) {
        // eslint-disable-next-line no-param-reassign
        token = removeBrackets(token);
        return !dots && i ? '[' + token + ']' : token;
      }).join(dots ? '.' : '');
    }

    /**
     * If the array is an array and none of its elements are visitable, then it's a flat array.
     *
     * @param {Array<any>} arr - The array to check
     *
     * @returns {boolean}
     */
    function isFlatArray(arr) {
      return utils.isArray(arr) && !arr.some(isVisitable);
    }

    const predicates = utils.toFlatObject(utils, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
    });

    /**
     * Convert a data object to FormData
     *
     * @param {Object} obj
     * @param {?Object} [formData]
     * @param {?Object} [options]
     * @param {Function} [options.visitor]
     * @param {Boolean} [options.metaTokens = true]
     * @param {Boolean} [options.dots = false]
     * @param {?Boolean} [options.indexes = false]
     *
     * @returns {Object}
     **/

    /**
     * It converts an object into a FormData object
     *
     * @param {Object<any, any>} obj - The object to convert to form data.
     * @param {string} formData - The FormData object to append to.
     * @param {Object<string, any>} options
     *
     * @returns
     */
    function toFormData(obj, formData, options) {
      if (!utils.isObject(obj)) {
        throw new TypeError('target must be an object');
      }

      // eslint-disable-next-line no-param-reassign
      formData = formData || new (FormData)();

      // eslint-disable-next-line no-param-reassign
      options = utils.toFlatObject(options, {
        metaTokens: true,
        dots: false,
        indexes: false
      }, false, function defined(option, source) {
        // eslint-disable-next-line no-eq-null,eqeqeq
        return !utils.isUndefined(source[option]);
      });

      const metaTokens = options.metaTokens;
      // eslint-disable-next-line no-use-before-define
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
      const useBlob = _Blob && utils.isSpecCompliantForm(formData);

      if (!utils.isFunction(visitor)) {
        throw new TypeError('visitor must be a function');
      }

      function convertValue(value) {
        if (value === null) return '';

        if (utils.isDate(value)) {
          return value.toISOString();
        }

        if (!useBlob && utils.isBlob(value)) {
          throw new AxiosError('Blob is not supported. Use a Buffer instead.');
        }

        if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
          return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
        }

        return value;
      }

      /**
       * Default visitor.
       *
       * @param {*} value
       * @param {String|Number} key
       * @param {Array<String|Number>} path
       * @this {FormData}
       *
       * @returns {boolean} return true to visit the each prop of the value recursively
       */
      function defaultVisitor(value, key, path) {
        let arr = value;

        if (value && !path && typeof value === 'object') {
          if (utils.endsWith(key, '{}')) {
            // eslint-disable-next-line no-param-reassign
            key = metaTokens ? key : key.slice(0, -2);
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          } else if (
            (utils.isArray(value) && isFlatArray(value)) ||
            ((utils.isFileList(value) || utils.endsWith(key, '[]')) && (arr = utils.toArray(value))
            )) {
            // eslint-disable-next-line no-param-reassign
            key = removeBrackets(key);

            arr.forEach(function each(el, index) {
              !(utils.isUndefined(el) || el === null) && formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
                convertValue(el)
              );
            });
            return false;
          }
        }

        if (isVisitable(value)) {
          return true;
        }

        formData.append(renderKey(path, key, dots), convertValue(value));

        return false;
      }

      const stack = [];

      const exposedHelpers = Object.assign(predicates, {
        defaultVisitor,
        convertValue,
        isVisitable
      });

      function build(value, path) {
        if (utils.isUndefined(value)) return;

        if (stack.indexOf(value) !== -1) {
          throw Error('Circular reference detected in ' + path.join('.'));
        }

        stack.push(value);

        utils.forEach(value, function each(el, key) {
          const result = !(utils.isUndefined(el) || el === null) && visitor.call(
            formData, el, utils.isString(key) ? key.trim() : key, path, exposedHelpers
          );

          if (result === true) {
            build(el, path ? path.concat(key) : [key]);
          }
        });

        stack.pop();
      }

      if (!utils.isObject(obj)) {
        throw new TypeError('data must be an object');
      }

      build(obj);

      return formData;
    }

    /**
     * It encodes a string by replacing all characters that are not in the unreserved set with
     * their percent-encoded equivalents
     *
     * @param {string} str - The string to encode.
     *
     * @returns {string} The encoded string.
     */
    function encode$1(str) {
      const charMap = {
        '!': '%21',
        "'": '%27',
        '(': '%28',
        ')': '%29',
        '~': '%7E',
        '%20': '+',
        '%00': '\x00'
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
        return charMap[match];
      });
    }

    /**
     * It takes a params object and converts it to a FormData object
     *
     * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
     * @param {Object<string, any>} options - The options object passed to the Axios constructor.
     *
     * @returns {void}
     */
    function AxiosURLSearchParams(params, options) {
      this._pairs = [];

      params && toFormData(params, this, options);
    }

    const prototype = AxiosURLSearchParams.prototype;

    prototype.append = function append(name, value) {
      this._pairs.push([name, value]);
    };

    prototype.toString = function toString(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode$1);
      } : encode$1;

      return this._pairs.map(function each(pair) {
        return _encode(pair[0]) + '=' + _encode(pair[1]);
      }, '').join('&');
    };

    /**
     * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
     * URI encoded counterparts
     *
     * @param {string} val The value to be encoded.
     *
     * @returns {string} The encoded value.
     */
    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @param {?object} options
     *
     * @returns {string} The formatted url
     */
    function buildURL(url, params, options) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }
      
      const _encode = options && options.encode || encode;

      const serializeFn = options && options.serialize;

      let serializedParams;

      if (serializeFn) {
        serializedParams = serializeFn(params, options);
      } else {
        serializedParams = utils.isURLSearchParams(params) ?
          params.toString() :
          new AxiosURLSearchParams(params, options).toString(_encode);
      }

      if (serializedParams) {
        const hashmarkIndex = url.indexOf("#");

        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }
        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    }

    class InterceptorManager {
      constructor() {
        this.handlers = [];
      }

      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }

      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }

      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }

      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils.forEach(this.handlers, function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        });
      }
    }

    var InterceptorManager$1 = InterceptorManager;

    var transitionalDefaults = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };

    var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

    var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

    var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     *
     * @returns {boolean}
     */
    const isStandardBrowserEnv = (() => {
      let product;
      if (typeof navigator !== 'undefined' && (
        (product = navigator.product) === 'ReactNative' ||
        product === 'NativeScript' ||
        product === 'NS')
      ) {
        return false;
      }

      return typeof window !== 'undefined' && typeof document !== 'undefined';
    })();

    /**
     * Determine if we're running in a standard browser webWorker environment
     *
     * Although the `isStandardBrowserEnv` method indicates that
     * `allows axios to run in a web worker`, the WebWorker will still be
     * filtered out due to its judgment standard
     * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
     * This leads to a problem when axios post `FormData` in webWorker
     */
     const isStandardBrowserWebWorkerEnv = (() => {
      return (
        typeof WorkerGlobalScope !== 'undefined' &&
        // eslint-disable-next-line no-undef
        self instanceof WorkerGlobalScope &&
        typeof self.importScripts === 'function'
      );
    })();


    var platform = {
      isBrowser: true,
      classes: {
        URLSearchParams: URLSearchParams$1,
        FormData: FormData$1,
        Blob: Blob$1
      },
      isStandardBrowserEnv,
      isStandardBrowserWebWorkerEnv,
      protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
    };

    function toURLEncodedForm(data, options) {
      return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
        visitor: function(value, key, path, helpers) {
          if (platform.isNode && utils.isBuffer(value)) {
            this.append(key, value.toString('base64'));
            return false;
          }

          return helpers.defaultVisitor.apply(this, arguments);
        }
      }, options));
    }

    /**
     * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
     *
     * @param {string} name - The name of the property to get.
     *
     * @returns An array of strings.
     */
    function parsePropPath(name) {
      // foo[x][y][z]
      // foo.x.y.z
      // foo-x-y-z
      // foo x y z
      return utils.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
        return match[0] === '[]' ? '' : match[1] || match[0];
      });
    }

    /**
     * Convert an array to an object.
     *
     * @param {Array<any>} arr - The array to convert to an object.
     *
     * @returns An object with the same keys and values as the array.
     */
    function arrayToObject(arr) {
      const obj = {};
      const keys = Object.keys(arr);
      let i;
      const len = keys.length;
      let key;
      for (i = 0; i < len; i++) {
        key = keys[i];
        obj[key] = arr[key];
      }
      return obj;
    }

    /**
     * It takes a FormData object and returns a JavaScript object
     *
     * @param {string} formData The FormData object to convert to JSON.
     *
     * @returns {Object<string, any> | null} The converted object.
     */
    function formDataToJSON(formData) {
      function buildPath(path, value, target, index) {
        let name = path[index++];
        const isNumericKey = Number.isFinite(+name);
        const isLast = index >= path.length;
        name = !name && utils.isArray(target) ? target.length : name;

        if (isLast) {
          if (utils.hasOwnProp(target, name)) {
            target[name] = [target[name], value];
          } else {
            target[name] = value;
          }

          return !isNumericKey;
        }

        if (!target[name] || !utils.isObject(target[name])) {
          target[name] = [];
        }

        const result = buildPath(path, value, target[name], index);

        if (result && utils.isArray(target[name])) {
          target[name] = arrayToObject(target[name]);
        }

        return !isNumericKey;
      }

      if (utils.isFormData(formData) && utils.isFunction(formData.entries)) {
        const obj = {};

        utils.forEachEntry(formData, (name, value) => {
          buildPath(parsePropPath(name), value, obj, 0);
        });

        return obj;
      }

      return null;
    }

    const DEFAULT_CONTENT_TYPE = {
      'Content-Type': undefined
    };

    /**
     * It takes a string, tries to parse it, and if it fails, it returns the stringified version
     * of the input
     *
     * @param {any} rawValue - The value to be stringified.
     * @param {Function} parser - A function that parses a string into a JavaScript object.
     * @param {Function} encoder - A function that takes a value and returns a string.
     *
     * @returns {string} A stringified version of the rawValue.
     */
    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    const defaults = {

      transitional: transitionalDefaults,

      adapter: ['xhr', 'http'],

      transformRequest: [function transformRequest(data, headers) {
        const contentType = headers.getContentType() || '';
        const hasJSONContentType = contentType.indexOf('application/json') > -1;
        const isObjectPayload = utils.isObject(data);

        if (isObjectPayload && utils.isHTMLForm(data)) {
          data = new FormData(data);
        }

        const isFormData = utils.isFormData(data);

        if (isFormData) {
          if (!hasJSONContentType) {
            return data;
          }
          return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
        }

        if (utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
          return data.toString();
        }

        let isFileList;

        if (isObjectPayload) {
          if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }

          if ((isFileList = utils.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
            const _FormData = this.env && this.env.FormData;

            return toFormData(
              isFileList ? {'files[]': data} : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }

        if (isObjectPayload || hasJSONContentType ) {
          headers.setContentType('application/json', false);
          return stringifySafely(data);
        }

        return data;
      }],

      transformResponse: [function transformResponse(data) {
        const transitional = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        const JSONRequested = this.responseType === 'json';

        if (data && utils.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
          const silentJSONParsing = transitional && transitional.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;

          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }

        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      env: {
        FormData: platform.classes.FormData,
        Blob: platform.classes.Blob
      },

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },

      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*'
        }
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults$1 = defaults;

    // RawAxiosHeaders whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    const ignoreDuplicateOf = utils.toObjectSet([
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ]);

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} rawHeaders Headers needing to be parsed
     *
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = rawHeaders => {
      const parsed = {};
      let key;
      let val;
      let i;

      rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
        i = line.indexOf(':');
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();

        if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
          return;
        }

        if (key === 'set-cookie') {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
        }
      });

      return parsed;
    };

    const $internals = Symbol('internals');

    function normalizeHeader(header) {
      return header && String(header).trim().toLowerCase();
    }

    function normalizeValue(value) {
      if (value === false || value == null) {
        return value;
      }

      return utils.isArray(value) ? value.map(normalizeValue) : String(value);
    }

    function parseTokens(str) {
      const tokens = Object.create(null);
      const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
      let match;

      while ((match = tokensRE.exec(str))) {
        tokens[match[1]] = match[2];
      }

      return tokens;
    }

    function isValidHeaderName(str) {
      return /^[-_a-zA-Z]+$/.test(str.trim());
    }

    function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
      if (utils.isFunction(filter)) {
        return filter.call(this, value, header);
      }

      if (isHeaderNameFilter) {
        value = header;
      }

      if (!utils.isString(value)) return;

      if (utils.isString(filter)) {
        return value.indexOf(filter) !== -1;
      }

      if (utils.isRegExp(filter)) {
        return filter.test(value);
      }
    }

    function formatHeader(header) {
      return header.trim()
        .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
          return char.toUpperCase() + str;
        });
    }

    function buildAccessors(obj, header) {
      const accessorName = utils.toCamelCase(' ' + header);

      ['get', 'set', 'has'].forEach(methodName => {
        Object.defineProperty(obj, methodName + accessorName, {
          value: function(arg1, arg2, arg3) {
            return this[methodName].call(this, header, arg1, arg2, arg3);
          },
          configurable: true
        });
      });
    }

    class AxiosHeaders {
      constructor(headers) {
        headers && this.set(headers);
      }

      set(header, valueOrRewrite, rewrite) {
        const self = this;

        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);

          if (!lHeader) {
            throw new Error('header name must be a non-empty string');
          }

          const key = utils.findKey(self, lHeader);

          if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
            self[key || _header] = normalizeValue(_value);
          }
        }

        const setHeaders = (headers, _rewrite) =>
          utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

        if (utils.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if(utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders(header), valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }

        return this;
      }

      get(header, parser) {
        header = normalizeHeader(header);

        if (header) {
          const key = utils.findKey(this, header);

          if (key) {
            const value = this[key];

            if (!parser) {
              return value;
            }

            if (parser === true) {
              return parseTokens(value);
            }

            if (utils.isFunction(parser)) {
              return parser.call(this, value, key);
            }

            if (utils.isRegExp(parser)) {
              return parser.exec(value);
            }

            throw new TypeError('parser must be boolean|regexp|function');
          }
        }
      }

      has(header, matcher) {
        header = normalizeHeader(header);

        if (header) {
          const key = utils.findKey(this, header);

          return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }

        return false;
      }

      delete(header, matcher) {
        const self = this;
        let deleted = false;

        function deleteHeader(_header) {
          _header = normalizeHeader(_header);

          if (_header) {
            const key = utils.findKey(self, _header);

            if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
              delete self[key];

              deleted = true;
            }
          }
        }

        if (utils.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }

        return deleted;
      }

      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;

        while (i--) {
          const key = keys[i];
          if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }

        return deleted;
      }

      normalize(format) {
        const self = this;
        const headers = {};

        utils.forEach(this, (value, header) => {
          const key = utils.findKey(headers, header);

          if (key) {
            self[key] = normalizeValue(value);
            delete self[header];
            return;
          }

          const normalized = format ? formatHeader(header) : String(header).trim();

          if (normalized !== header) {
            delete self[header];
          }

          self[normalized] = normalizeValue(value);

          headers[normalized] = true;
        });

        return this;
      }

      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }

      toJSON(asStrings) {
        const obj = Object.create(null);

        utils.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
        });

        return obj;
      }

      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }

      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
      }

      get [Symbol.toStringTag]() {
        return 'AxiosHeaders';
      }

      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }

      static concat(first, ...targets) {
        const computed = new this(first);

        targets.forEach((target) => computed.set(target));

        return computed;
      }

      static accessor(header) {
        const internals = this[$internals] = (this[$internals] = {
          accessors: {}
        });

        const accessors = internals.accessors;
        const prototype = this.prototype;

        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);

          if (!accessors[lHeader]) {
            buildAccessors(prototype, _header);
            accessors[lHeader] = true;
          }
        }

        utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

        return this;
      }
    }

    AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

    utils.freezeMethods(AxiosHeaders.prototype);
    utils.freezeMethods(AxiosHeaders);

    var AxiosHeaders$1 = AxiosHeaders;

    /**
     * Transform the data for a request or a response
     *
     * @param {Array|Function} fns A single function or Array of functions
     * @param {?Object} response The response object
     *
     * @returns {*} The resulting transformed data
     */
    function transformData(fns, response) {
      const config = this || defaults$1;
      const context = response || config;
      const headers = AxiosHeaders$1.from(context.headers);
      let data = context.data;

      utils.forEach(fns, function transform(fn) {
        data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
      });

      headers.normalize();

      return data;
    }

    function isCancel(value) {
      return !!(value && value.__CANCEL__);
    }

    /**
     * A `CanceledError` is an object that is thrown when an operation is canceled.
     *
     * @param {string=} message The message.
     * @param {Object=} config The config.
     * @param {Object=} request The request.
     *
     * @returns {CanceledError} The created error.
     */
    function CanceledError(message, config, request) {
      // eslint-disable-next-line no-eq-null,eqeqeq
      AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
      this.name = 'CanceledError';
    }

    utils.inherits(CanceledError, AxiosError, {
      __CANCEL__: true
    });

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     *
     * @returns {object} The response.
     */
    function settle(resolve, reject, response) {
      const validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(new AxiosError(
          'Request failed with status code ' + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        ));
      }
    }

    var cookies = platform.isStandardBrowserEnv ?

    // Standard browser envs support document.cookie
      (function standardBrowserEnv() {
        return {
          write: function write(name, value, expires, path, domain, secure) {
            const cookie = [];
            cookie.push(name + '=' + encodeURIComponent(value));

            if (utils.isNumber(expires)) {
              cookie.push('expires=' + new Date(expires).toGMTString());
            }

            if (utils.isString(path)) {
              cookie.push('path=' + path);
            }

            if (utils.isString(domain)) {
              cookie.push('domain=' + domain);
            }

            if (secure === true) {
              cookie.push('secure');
            }

            document.cookie = cookie.join('; ');
          },

          read: function read(name) {
            const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
            return (match ? decodeURIComponent(match[3]) : null);
          },

          remove: function remove(name) {
            this.write(name, '', Date.now() - 86400000);
          }
        };
      })() :

    // Non standard browser env (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return {
          write: function write() {},
          read: function read() { return null; },
          remove: function remove() {}
        };
      })();

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     *
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    }

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     *
     * @returns {string} The combined URL
     */
    function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    }

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     *
     * @returns {string} The combined full path
     */
    function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    }

    var isURLSameOrigin = platform.isStandardBrowserEnv ?

    // Standard browser envs have full support of the APIs needed to test
    // whether the request URL is of the same origin as current location.
      (function standardBrowserEnv() {
        const msie = /(msie|trident)/i.test(navigator.userAgent);
        const urlParsingNode = document.createElement('a');
        let originURL;

        /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
        function resolveURL(url) {
          let href = url;

          if (msie) {
            // IE needs attribute set twice to normalize properties
            urlParsingNode.setAttribute('href', href);
            href = urlParsingNode.href;
          }

          urlParsingNode.setAttribute('href', href);

          // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
          return {
            href: urlParsingNode.href,
            protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
            host: urlParsingNode.host,
            search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
            hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
            hostname: urlParsingNode.hostname,
            port: urlParsingNode.port,
            pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
              urlParsingNode.pathname :
              '/' + urlParsingNode.pathname
          };
        }

        originURL = resolveURL(window.location.href);

        /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
        return function isURLSameOrigin(requestURL) {
          const parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
          return (parsed.protocol === originURL.protocol &&
              parsed.host === originURL.host);
        };
      })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
      (function nonStandardBrowserEnv() {
        return function isURLSameOrigin() {
          return true;
        };
      })();

    function parseProtocol(url) {
      const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
      return match && match[1] || '';
    }

    /**
     * Calculate data maxRate
     * @param {Number} [samplesCount= 10]
     * @param {Number} [min= 1000]
     * @returns {Function}
     */
    function speedometer(samplesCount, min) {
      samplesCount = samplesCount || 10;
      const bytes = new Array(samplesCount);
      const timestamps = new Array(samplesCount);
      let head = 0;
      let tail = 0;
      let firstSampleTS;

      min = min !== undefined ? min : 1000;

      return function push(chunkLength) {
        const now = Date.now();

        const startedAt = timestamps[tail];

        if (!firstSampleTS) {
          firstSampleTS = now;
        }

        bytes[head] = chunkLength;
        timestamps[head] = now;

        let i = tail;
        let bytesCount = 0;

        while (i !== head) {
          bytesCount += bytes[i++];
          i = i % samplesCount;
        }

        head = (head + 1) % samplesCount;

        if (head === tail) {
          tail = (tail + 1) % samplesCount;
        }

        if (now - firstSampleTS < min) {
          return;
        }

        const passed = startedAt && now - startedAt;

        return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
      };
    }

    function progressEventReducer(listener, isDownloadStream) {
      let bytesNotified = 0;
      const _speedometer = speedometer(50, 250);

      return e => {
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : undefined;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;

        bytesNotified = loaded;

        const data = {
          loaded,
          total,
          progress: total ? (loaded / total) : undefined,
          bytes: progressBytes,
          rate: rate ? rate : undefined,
          estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
          event: e
        };

        data[isDownloadStream ? 'download' : 'upload'] = true;

        listener(data);
      };
    }

    const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

    var xhrAdapter = isXHRAdapterSupported && function (config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        let requestData = config.data;
        const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
        const responseType = config.responseType;
        let onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener('abort', onCanceled);
          }
        }

        if (utils.isFormData(requestData) && (platform.isStandardBrowserEnv || platform.isStandardBrowserWebWorkerEnv)) {
          requestHeaders.setContentType(false); // Let the browser set it
        }

        let request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          const username = config.auth.username || '';
          const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
        }

        const fullPath = buildFullPath(config.baseURL, config.url);

        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          const responseHeaders = AxiosHeaders$1.from(
            'getAllResponseHeaders' in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
            request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };

          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);

          // Clean up request
          request = null;
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
          const transitional = config.transitional || transitionalDefaults;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(new AxiosError(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
            config,
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (platform.isStandardBrowserEnv) {
          // Add xsrf header
          const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
            && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

          if (xsrfValue) {
            requestHeaders.set(config.xsrfHeaderName, xsrfValue);
          }
        }

        // Remove Content-Type if data is undefined
        requestData === undefined && requestHeaders.setContentType(null);

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = cancel => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
          }
        }

        const protocol = parseProtocol(fullPath);

        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
          return;
        }


        // Send the request
        request.send(requestData || null);
      });
    };

    const knownAdapters = {
      http: httpAdapter,
      xhr: xhrAdapter
    };

    utils.forEach(knownAdapters, (fn, value) => {
      if(fn) {
        try {
          Object.defineProperty(fn, 'name', {value});
        } catch (e) {
          // eslint-disable-next-line no-empty
        }
        Object.defineProperty(fn, 'adapterName', {value});
      }
    });

    var adapters = {
      getAdapter: (adapters) => {
        adapters = utils.isArray(adapters) ? adapters : [adapters];

        const {length} = adapters;
        let nameOrAdapter;
        let adapter;

        for (let i = 0; i < length; i++) {
          nameOrAdapter = adapters[i];
          if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
            break;
          }
        }

        if (!adapter) {
          if (adapter === false) {
            throw new AxiosError(
              `Adapter ${nameOrAdapter} is not supported by the environment`,
              'ERR_NOT_SUPPORT'
            );
          }

          throw new Error(
            utils.hasOwnProp(knownAdapters, nameOrAdapter) ?
              `Adapter '${nameOrAdapter}' is not available in the build` :
              `Unknown adapter '${nameOrAdapter}'`
          );
        }

        if (!utils.isFunction(adapter)) {
          throw new TypeError('adapter is not a function');
        }

        return adapter;
      },
      adapters: knownAdapters
    };

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     *
     * @param {Object} config The config that is to be used for the request
     *
     * @returns {void}
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }

      if (config.signal && config.signal.aborted) {
        throw new CanceledError(null, config);
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     *
     * @returns {Promise} The Promise to be fulfilled
     */
    function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      config.headers = AxiosHeaders$1.from(config.headers);

      // Transform request data
      config.data = transformData.call(
        config,
        config.transformRequest
      );

      if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
        config.headers.setContentType('application/x-www-form-urlencoded', false);
      }

      const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );

        response.headers = AxiosHeaders$1.from(response.headers);

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
          }
        }

        return Promise.reject(reason);
      });
    }

    const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? thing.toJSON() : thing;

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     *
     * @returns {Object} New object resulting from merging config2 to config1
     */
    function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      const config = {};

      function getMergedValue(target, source, caseless) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge.call({caseless}, target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(a, b, caseless) {
        if (!utils.isUndefined(b)) {
          return getMergedValue(a, b, caseless);
        } else if (!utils.isUndefined(a)) {
          return getMergedValue(undefined, a, caseless);
        }
      }

      // eslint-disable-next-line consistent-return
      function valueFromConfig2(a, b) {
        if (!utils.isUndefined(b)) {
          return getMergedValue(undefined, b);
        }
      }

      // eslint-disable-next-line consistent-return
      function defaultToConfig2(a, b) {
        if (!utils.isUndefined(b)) {
          return getMergedValue(undefined, b);
        } else if (!utils.isUndefined(a)) {
          return getMergedValue(undefined, a);
        }
      }

      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(a, b, prop) {
        if (prop in config2) {
          return getMergedValue(a, b);
        } else if (prop in config1) {
          return getMergedValue(undefined, a);
        }
      }

      const mergeMap = {
        url: valueFromConfig2,
        method: valueFromConfig2,
        data: valueFromConfig2,
        baseURL: defaultToConfig2,
        transformRequest: defaultToConfig2,
        transformResponse: defaultToConfig2,
        paramsSerializer: defaultToConfig2,
        timeout: defaultToConfig2,
        timeoutMessage: defaultToConfig2,
        withCredentials: defaultToConfig2,
        adapter: defaultToConfig2,
        responseType: defaultToConfig2,
        xsrfCookieName: defaultToConfig2,
        xsrfHeaderName: defaultToConfig2,
        onUploadProgress: defaultToConfig2,
        onDownloadProgress: defaultToConfig2,
        decompress: defaultToConfig2,
        maxContentLength: defaultToConfig2,
        maxBodyLength: defaultToConfig2,
        beforeRedirect: defaultToConfig2,
        transport: defaultToConfig2,
        httpAgent: defaultToConfig2,
        httpsAgent: defaultToConfig2,
        cancelToken: defaultToConfig2,
        socketPath: defaultToConfig2,
        responseEncoding: defaultToConfig2,
        validateStatus: mergeDirectKeys,
        headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
      };

      utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
        const merge = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge(config1[prop], config2[prop], prop);
        (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
      });

      return config;
    }

    const VERSION = "1.3.4";

    const validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    const deprecatedWarnings = {};

    /**
     * Transitional option validator
     *
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     *
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return (value, opt, opts) => {
        if (validator === false) {
          throw new AxiosError(
            formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
            AxiosError.ERR_DEPRECATED
          );
        }

        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     *
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     *
     * @returns {object}
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
      }
      const keys = Object.keys(options);
      let i = keys.length;
      while (i-- > 0) {
        const opt = keys[i];
        const validator = schema[opt];
        if (validator) {
          const value = options[opt];
          const result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
        }
      }
    }

    var validator = {
      assertOptions,
      validators: validators$1
    };

    const validators = validator.validators;

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     *
     * @return {Axios} A new instance of Axios
     */
    class Axios {
      constructor(instanceConfig) {
        this.defaults = instanceConfig;
        this.interceptors = {
          request: new InterceptorManager$1(),
          response: new InterceptorManager$1()
        };
      }

      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      request(configOrUrl, config) {
        /*eslint no-param-reassign:0*/
        // Allow for axios('example/url'[, config]) a la fetch API
        if (typeof configOrUrl === 'string') {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }

        config = mergeConfig(this.defaults, config);

        const {transitional, paramsSerializer, headers} = config;

        if (transitional !== undefined) {
          validator.assertOptions(transitional, {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean)
          }, false);
        }

        if (paramsSerializer !== undefined) {
          validator.assertOptions(paramsSerializer, {
            encode: validators.function,
            serialize: validators.function
          }, true);
        }

        // Set config.method
        config.method = (config.method || this.defaults.method || 'get').toLowerCase();

        let contextHeaders;

        // Flatten headers
        contextHeaders = headers && utils.merge(
          headers.common,
          headers[config.method]
        );

        contextHeaders && utils.forEach(
          ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
          (method) => {
            delete headers[method];
          }
        );

        config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

        // filter out skipped interceptors
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
            return;
          }

          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

          requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
        });

        const responseInterceptorChain = [];
        this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        });

        let promise;
        let i = 0;
        let len;

        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), undefined];
          chain.unshift.apply(chain, requestInterceptorChain);
          chain.push.apply(chain, responseInterceptorChain);
          len = chain.length;

          promise = Promise.resolve(config);

          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }

          return promise;
        }

        len = requestInterceptorChain.length;

        let newConfig = config;

        i = 0;

        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }

        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }

        i = 0;
        len = responseInterceptorChain.length;

        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }

        return promise;
      }

      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    }

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/

      function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
          return this.request(mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              'Content-Type': 'multipart/form-data'
            } : {},
            url,
            data
          }));
        };
      }

      Axios.prototype[method] = generateHTTPMethod();

      Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
    });

    var Axios$1 = Axios;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @param {Function} executor The executor function.
     *
     * @returns {CancelToken}
     */
    class CancelToken {
      constructor(executor) {
        if (typeof executor !== 'function') {
          throw new TypeError('executor must be a function.');
        }

        let resolvePromise;

        this.promise = new Promise(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        });

        const token = this;

        // eslint-disable-next-line func-names
        this.promise.then(cancel => {
          if (!token._listeners) return;

          let i = token._listeners.length;

          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });

        // eslint-disable-next-line func-names
        this.promise.then = onfulfilled => {
          let _resolve;
          // eslint-disable-next-line func-names
          const promise = new Promise(resolve => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);

          promise.cancel = function reject() {
            token.unsubscribe(_resolve);
          };

          return promise;
        };

        executor(function cancel(message, config, request) {
          if (token.reason) {
            // Cancellation has already been requested
            return;
          }

          token.reason = new CanceledError(message, config, request);
          resolvePromise(token.reason);
        });
      }

      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }

      /**
       * Subscribe to the cancel signal
       */

      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }

        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }

      /**
       * Unsubscribe from the cancel signal
       */

      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }

      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new CancelToken(function executor(c) {
          cancel = c;
        });
        return {
          token,
          cancel
        };
      }
    }

    var CancelToken$1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     *
     * @returns {Function}
     */
    function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    }

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     *
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    function isAxiosError(payload) {
      return utils.isObject(payload) && (payload.isAxiosError === true);
    }

    const HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511,
    };

    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });

    var HttpStatusCode$1 = HttpStatusCode;

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     *
     * @returns {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      const context = new Axios$1(defaultConfig);
      const instance = bind(Axios$1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

      // Copy context to instance
      utils.extend(instance, context, null, {allOwnKeys: true});

      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };

      return instance;
    }

    // Create the default instance to be exported
    const axios = createInstance(defaults$1);

    // Expose Axios class to allow class inheritance
    axios.Axios = Axios$1;

    // Expose Cancel & CancelToken
    axios.CanceledError = CanceledError;
    axios.CancelToken = CancelToken$1;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData;

    // Expose AxiosError class
    axios.AxiosError = AxiosError;

    // alias for CanceledError for backward compatibility
    axios.Cancel = axios.CanceledError;

    // Expose all/spread
    axios.all = function all(promises) {
      return Promise.all(promises);
    };

    axios.spread = spread;

    // Expose isAxiosError
    axios.isAxiosError = isAxiosError;

    // Expose mergeConfig
    axios.mergeConfig = mergeConfig;

    axios.AxiosHeaders = AxiosHeaders$1;

    axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

    axios.HttpStatusCode = HttpStatusCode$1;

    axios.default = axios;

    // this module should only have a default export
    var axios$1 = axios;

    /* src/pages/Mens.svelte generated by Svelte v3.55.1 */

    const { console: console_1 } = globals;
    const file$5 = "src/pages/Mens.svelte";

    function create_fragment$5(ctx) {
    	let div20;
    	let h1;
    	let t1;
    	let div0;
    	let t2;
    	let div17;
    	let div1;
    	let t3;
    	let div2;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let div3;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let div4;
    	let label2;
    	let t11;
    	let input2;
    	let t12;
    	let div5;
    	let label3;
    	let t14;
    	let input3;
    	let t15;
    	let div6;
    	let t16;
    	let div7;
    	let t17;
    	let div8;
    	let t18;
    	let div9;
    	let t19;
    	let div10;
    	let label4;
    	let t20;
    	let p;
    	let t22;
    	let div11;
    	let label5;
    	let t24;
    	let input4;
    	let t25;
    	let div12;
    	let label6;
    	let t27;
    	let input5;
    	let t28;
    	let div13;
    	let t29;
    	let div14;
    	let t30;
    	let div15;
    	let t31;
    	let div16;
    	let button0;
    	let t33;
    	let div18;
    	let t34;
    	let div19;
    	let img;
    	let img_src_value;
    	let t35;
    	let div26;
    	let div25;
    	let div24;
    	let div21;
    	let h5;
    	let t37;
    	let button1;
    	let t38;
    	let div22;
    	let t39;
    	let t40;
    	let t41;
    	let t42;
    	let div23;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div20 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Are you Ovulating?";
    			t1 = space();
    			div0 = element("div");
    			t2 = space();
    			div17 = element("div");
    			div1 = element("div");
    			t3 = space();
    			div2 = element("div");
    			label0 = element("label");
    			label0.textContent = "Age";
    			t5 = space();
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Weight";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			div4 = element("div");
    			label2 = element("label");
    			label2.textContent = "Height";
    			t11 = space();
    			input2 = element("input");
    			t12 = space();
    			div5 = element("div");
    			label3 = element("label");
    			label3.textContent = "BMI";
    			t14 = space();
    			input3 = element("input");
    			t15 = space();
    			div6 = element("div");
    			t16 = space();
    			div7 = element("div");
    			t17 = space();
    			div8 = element("div");
    			t18 = space();
    			div9 = element("div");
    			t19 = space();
    			div10 = element("div");
    			label4 = element("label");
    			t20 = space();
    			p = element("p");
    			p.textContent = "Length of";
    			t22 = space();
    			div11 = element("div");
    			label5 = element("label");
    			label5.textContent = "Average Cycle";
    			t24 = space();
    			input4 = element("input");
    			t25 = space();
    			div12 = element("div");
    			label6 = element("label");
    			label6.textContent = "Menstruation";
    			t27 = space();
    			input5 = element("input");
    			t28 = space();
    			div13 = element("div");
    			t29 = space();
    			div14 = element("div");
    			t30 = space();
    			div15 = element("div");
    			t31 = space();
    			div16 = element("div");
    			button0 = element("button");
    			button0.textContent = "Ovulation estimation";
    			t33 = space();
    			div18 = element("div");
    			t34 = space();
    			div19 = element("div");
    			img = element("img");
    			t35 = space();
    			div26 = element("div");
    			div25 = element("div");
    			div24 = element("div");
    			div21 = element("div");
    			h5 = element("h5");
    			h5.textContent = "Ovulation Estimation";
    			t37 = space();
    			button1 = element("button");
    			t38 = space();
    			div22 = element("div");
    			t39 = text("Our model predicts that you will be Ovulating on the ");
    			t40 = text(/*ovulation*/ ctx[6]);
    			t41 = text(". Day of\n\t\t\tyour Cycle!");
    			t42 = space();
    			div23 = element("div");
    			button2 = element("button");
    			button2.textContent = "Close";
    			add_location(h1, file$5, 39, 1, 717);
    			attr_dev(div0, "class", "col-md-12");
    			add_location(div0, file$5, 42, 1, 748);
    			attr_dev(div1, "class", "col col-lg-3");
    			add_location(div1, file$5, 45, 2, 822);
    			attr_dev(label0, "for", "Age");
    			add_location(label0, file$5, 47, 3, 883);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "placeholder", "Age");
    			attr_dev(input0, "aria-label", "Age");
    			add_location(input0, file$5, 48, 3, 915);
    			attr_dev(div2, "class", "col col-lg-2");
    			add_location(div2, file$5, 46, 2, 853);
    			attr_dev(label1, "for", "Weight");
    			add_location(label1, file$5, 57, 3, 1076);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "placeholder", "Weight");
    			attr_dev(input1, "aria-label", "Weight");
    			add_location(input1, file$5, 58, 3, 1114);
    			attr_dev(div3, "class", "col col-lg-2");
    			add_location(div3, file$5, 56, 2, 1046);
    			attr_dev(label2, "for", "Height");
    			add_location(label2, file$5, 67, 3, 1284);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "class", "form-control");
    			attr_dev(input2, "placeholder", "Height");
    			attr_dev(input2, "aria-label", "Height");
    			add_location(input2, file$5, 68, 3, 1322);
    			attr_dev(div4, "class", "col col-lg-2");
    			add_location(div4, file$5, 66, 2, 1254);
    			attr_dev(label3, "for", "BMI");
    			add_location(label3, file$5, 77, 3, 1492);
    			attr_dev(input3, "type", "text");
    			input3.readOnly = true;
    			attr_dev(input3, "class", "form-control-plaintext");
    			attr_dev(input3, "aria-label", "BMI");
    			input3.value = /*bmi*/ ctx[5];
    			add_location(input3, file$5, 78, 3, 1524);
    			attr_dev(div5, "class", "col col-lg-2");
    			add_location(div5, file$5, 76, 2, 1462);
    			attr_dev(div6, "class", "col col-lg-1");
    			add_location(div6, file$5, 86, 2, 1649);
    			attr_dev(div7, "class", "col-md-8");
    			add_location(div7, file$5, 87, 2, 1680);
    			attr_dev(div8, "class", "col col-lg-4");
    			add_location(div8, file$5, 88, 2, 1707);
    			attr_dev(div9, "class", "col col-lg-2");
    			add_location(div9, file$5, 89, 2, 1738);
    			attr_dev(label4, "for", "length");
    			add_location(label4, file$5, 91, 3, 1799);
    			add_location(p, file$5, 92, 3, 1825);
    			attr_dev(div10, "class", "col col-lg-2");
    			add_location(div10, file$5, 90, 2, 1769);
    			attr_dev(label5, "for", "cycle");
    			add_location(label5, file$5, 96, 3, 1884);
    			attr_dev(input4, "type", "number");
    			attr_dev(input4, "class", "form-control");
    			attr_dev(input4, "placeholder", "in Days");
    			attr_dev(input4, "aria-label", "cycle");
    			add_location(input4, file$5, 97, 3, 1928);
    			attr_dev(div11, "class", "col col-lg-2");
    			add_location(div11, file$5, 95, 2, 1854);
    			attr_dev(label6, "for", "mens");
    			add_location(label6, file$5, 106, 3, 2105);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "class", "form-control");
    			attr_dev(input5, "placeholder", "in Days");
    			attr_dev(input5, "aria-label", "Mens");
    			add_location(input5, file$5, 107, 3, 2147);
    			attr_dev(div12, "class", "col col-lg-2");
    			add_location(div12, file$5, 105, 2, 2075);
    			attr_dev(div13, "class", "col col-lg-4");
    			add_location(div13, file$5, 115, 2, 2292);
    			attr_dev(div14, "class", "col-md-8");
    			add_location(div14, file$5, 117, 2, 2324);
    			attr_dev(div15, "class", "col col-lg-4");
    			add_location(div15, file$5, 118, 2, 2351);
    			attr_dev(button0, "data-bs-toggle", "modal");
    			attr_dev(button0, "data-bs-target", "#exampleModal");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "my-button");
    			attr_dev(button0, "data-toggle", "modal");
    			attr_dev(button0, "data-target", "#ovulationModal");
    			add_location(button0, file$5, 121, 3, 2413);
    			attr_dev(div16, "class", "col col-lg-2");
    			add_location(div16, file$5, 120, 2, 2383);
    			attr_dev(div17, "class", "row justify-content-md-center");
    			add_location(div17, file$5, 44, 1, 776);
    			attr_dev(div18, "class", "col-md-8");
    			add_location(div18, file$5, 134, 1, 2706);
    			if (!src_url_equal(img.src, img_src_value = "pictures/cycle.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "rounded mx-auto d-block");
    			attr_dev(img, "alt", "...");
    			add_location(img, file$5, 136, 2, 2778);
    			attr_dev(div19, "class", "row justify-content-md-center");
    			add_location(div19, file$5, 135, 1, 2732);
    			attr_dev(div20, "class", "container text-center");
    			add_location(div20, file$5, 38, 0, 680);
    			attr_dev(h5, "class", "modal-title");
    			attr_dev(h5, "id", "exampleModalLabel");
    			add_location(h5, file$5, 146, 4, 3089);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn-close");
    			attr_dev(button1, "data-bs-dismiss", "modal");
    			attr_dev(button1, "aria-label", "Close");
    			add_location(button1, file$5, 147, 4, 3166);
    			attr_dev(div21, "class", "modal-header");
    			add_location(div21, file$5, 145, 2, 3058);
    			attr_dev(div22, "class", "modal-body");
    			add_location(div22, file$5, 149, 2, 3270);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-secondary");
    			attr_dev(button2, "data-bs-dismiss", "modal");
    			add_location(button2, file$5, 154, 4, 3428);
    			attr_dev(div23, "class", "modal-footer");
    			add_location(div23, file$5, 153, 2, 3397);
    			attr_dev(div24, "class", "modal-content");
    			add_location(div24, file$5, 144, 3, 3028);
    			attr_dev(div25, "class", "modal-dialog");
    			add_location(div25, file$5, 143, 1, 2998);
    			attr_dev(div26, "class", "modal fade");
    			attr_dev(div26, "id", "exampleModal");
    			attr_dev(div26, "tabindex", "-1");
    			attr_dev(div26, "aria-labelledby", "exampleModalLabel");
    			attr_dev(div26, "aria-hidden", "true");
    			add_location(div26, file$5, 142, 0, 2885);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div20, anchor);
    			append_dev(div20, h1);
    			append_dev(div20, t1);
    			append_dev(div20, div0);
    			append_dev(div20, t2);
    			append_dev(div20, div17);
    			append_dev(div17, div1);
    			append_dev(div17, t3);
    			append_dev(div17, div2);
    			append_dev(div2, label0);
    			append_dev(div2, t5);
    			append_dev(div2, input0);
    			set_input_value(input0, /*age*/ ctx[0]);
    			append_dev(div17, t6);
    			append_dev(div17, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t8);
    			append_dev(div3, input1);
    			set_input_value(input1, /*weight*/ ctx[2]);
    			append_dev(div17, t9);
    			append_dev(div17, div4);
    			append_dev(div4, label2);
    			append_dev(div4, t11);
    			append_dev(div4, input2);
    			set_input_value(input2, /*height*/ ctx[1]);
    			append_dev(div17, t12);
    			append_dev(div17, div5);
    			append_dev(div5, label3);
    			append_dev(div5, t14);
    			append_dev(div5, input3);
    			append_dev(div17, t15);
    			append_dev(div17, div6);
    			append_dev(div17, t16);
    			append_dev(div17, div7);
    			append_dev(div17, t17);
    			append_dev(div17, div8);
    			append_dev(div17, t18);
    			append_dev(div17, div9);
    			append_dev(div17, t19);
    			append_dev(div17, div10);
    			append_dev(div10, label4);
    			append_dev(div10, t20);
    			append_dev(div10, p);
    			append_dev(div17, t22);
    			append_dev(div17, div11);
    			append_dev(div11, label5);
    			append_dev(div11, t24);
    			append_dev(div11, input4);
    			set_input_value(input4, /*lengthofCycle*/ ctx[3]);
    			append_dev(div17, t25);
    			append_dev(div17, div12);
    			append_dev(div12, label6);
    			append_dev(div12, t27);
    			append_dev(div12, input5);
    			set_input_value(input5, /*lengthofMens*/ ctx[4]);
    			append_dev(div17, t28);
    			append_dev(div17, div13);
    			append_dev(div17, t29);
    			append_dev(div17, div14);
    			append_dev(div17, t30);
    			append_dev(div17, div15);
    			append_dev(div17, t31);
    			append_dev(div17, div16);
    			append_dev(div16, button0);
    			append_dev(div20, t33);
    			append_dev(div20, div18);
    			append_dev(div20, t34);
    			append_dev(div20, div19);
    			append_dev(div19, img);
    			insert_dev(target, t35, anchor);
    			insert_dev(target, div26, anchor);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div24, div21);
    			append_dev(div21, h5);
    			append_dev(div21, t37);
    			append_dev(div21, button1);
    			append_dev(div24, t38);
    			append_dev(div24, div22);
    			append_dev(div22, t39);
    			append_dev(div22, t40);
    			append_dev(div22, t41);
    			append_dev(div24, t42);
    			append_dev(div24, div23);
    			append_dev(div23, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[12]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[13]),
    					listen_dev(button0, "click", /*handleSubmit*/ ctx[7], false, false, false),
    					listen_dev(
    						button0,
    						"click",
    						function () {
    							if (is_function(/*calculateBMI*/ ctx[8](/*weight*/ ctx[2], /*height*/ ctx[1]))) /*calculateBMI*/ ctx[8](/*weight*/ ctx[2], /*height*/ ctx[1]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*age*/ 1 && to_number(input0.value) !== /*age*/ ctx[0]) {
    				set_input_value(input0, /*age*/ ctx[0]);
    			}

    			if (dirty & /*weight*/ 4 && to_number(input1.value) !== /*weight*/ ctx[2]) {
    				set_input_value(input1, /*weight*/ ctx[2]);
    			}

    			if (dirty & /*height*/ 2 && to_number(input2.value) !== /*height*/ ctx[1]) {
    				set_input_value(input2, /*height*/ ctx[1]);
    			}

    			if (dirty & /*bmi*/ 32 && input3.value !== /*bmi*/ ctx[5]) {
    				prop_dev(input3, "value", /*bmi*/ ctx[5]);
    			}

    			if (dirty & /*lengthofCycle*/ 8 && to_number(input4.value) !== /*lengthofCycle*/ ctx[3]) {
    				set_input_value(input4, /*lengthofCycle*/ ctx[3]);
    			}

    			if (dirty & /*lengthofMens*/ 16 && to_number(input5.value) !== /*lengthofMens*/ ctx[4]) {
    				set_input_value(input5, /*lengthofMens*/ ctx[4]);
    			}

    			if (dirty & /*ovulation*/ 64) set_data_dev(t40, /*ovulation*/ ctx[6]);
    		},
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div20);
    			if (detaching) detach_dev(t35);
    			if (detaching) detach_dev(div26);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Mens', slots, []);
    	let age;
    	let height;
    	let weight;
    	let lengthofCycle;
    	let lengthofMens;
    	let bmi = "";
    	let ovulation = "...";

    	function handleSubmit() {
    		let url = // $base_url +
    		"https://kollesal.pythonanywhere.com" + "/api/prediction/mens?age=" + age + "&cycle=" + lengthofCycle + "&menses=" + lengthofMens + "&weight=" + weight + "&height=" + height;

    		console.log(url);

    		axios$1.get(url).then(response => {
    			$$invalidate(6, ovulation = response.data);
    		});
    	}

    	function calculateBMI(weight, height) {
    		$$invalidate(5, bmi = (weight / height / height * 10000).toFixed(2));
    		return bmi;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Mens> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		age = to_number(this.value);
    		$$invalidate(0, age);
    	}

    	function input1_input_handler() {
    		weight = to_number(this.value);
    		$$invalidate(2, weight);
    	}

    	function input2_input_handler() {
    		height = to_number(this.value);
    		$$invalidate(1, height);
    	}

    	function input4_input_handler() {
    		lengthofCycle = to_number(this.value);
    		$$invalidate(3, lengthofCycle);
    	}

    	function input5_input_handler() {
    		lengthofMens = to_number(this.value);
    		$$invalidate(4, lengthofMens);
    	}

    	$$self.$capture_state = () => ({
    		base_url,
    		axios: axios$1,
    		age,
    		height,
    		weight,
    		lengthofCycle,
    		lengthofMens,
    		bmi,
    		ovulation,
    		handleSubmit,
    		calculateBMI
    	});

    	$$self.$inject_state = $$props => {
    		if ('age' in $$props) $$invalidate(0, age = $$props.age);
    		if ('height' in $$props) $$invalidate(1, height = $$props.height);
    		if ('weight' in $$props) $$invalidate(2, weight = $$props.weight);
    		if ('lengthofCycle' in $$props) $$invalidate(3, lengthofCycle = $$props.lengthofCycle);
    		if ('lengthofMens' in $$props) $$invalidate(4, lengthofMens = $$props.lengthofMens);
    		if ('bmi' in $$props) $$invalidate(5, bmi = $$props.bmi);
    		if ('ovulation' in $$props) $$invalidate(6, ovulation = $$props.ovulation);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		age,
    		height,
    		weight,
    		lengthofCycle,
    		lengthofMens,
    		bmi,
    		ovulation,
    		handleSubmit,
    		calculateBMI,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input4_input_handler,
    		input5_input_handler
    	];
    }

    class Mens extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Mens",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/pages/Data.svelte generated by Svelte v3.55.1 */
    const file$4 = "src/pages/Data.svelte";

    function create_fragment$4(ctx) {
    	let div7;
    	let h10;
    	let t1;
    	let h2;
    	let t3;
    	let h30;
    	let t5;
    	let p0;
    	let t7;
    	let ul0;
    	let li0;
    	let t9;
    	let li1;
    	let t11;
    	let li2;
    	let t13;
    	let li3;
    	let t15;
    	let h31;
    	let t17;
    	let p1;
    	let t19;
    	let ul1;
    	let li4;
    	let t21;
    	let li5;
    	let t23;
    	let li6;
    	let t25;
    	let li7;
    	let t27;
    	let li8;
    	let t29;
    	let div0;
    	let t30;
    	let h32;
    	let t32;
    	let ul2;
    	let li9;
    	let t33;
    	let a0;
    	let t35;
    	let li10;
    	let t37;
    	let li11;
    	let t39;
    	let li12;
    	let t40;
    	let a1;
    	let t42;
    	let div1;
    	let t43;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t44;
    	let h33;
    	let t46;
    	let ul3;
    	let li13;
    	let t48;
    	let li14;
    	let t50;
    	let li15;
    	let t52;
    	let div3;
    	let t53;
    	let div4;
    	let img1;
    	let img1_src_value;
    	let t54;
    	let h34;
    	let t56;
    	let ul4;
    	let li16;
    	let t58;
    	let li17;
    	let t60;
    	let li18;
    	let t62;
    	let p2;
    	let t63;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t64;
    	let p3;
    	let t65;
    	let li19;
    	let t66;
    	let p4;
    	let t67;
    	let div6;
    	let img3;
    	let img3_src_value;
    	let t68;
    	let h11;
    	let t70;
    	let h35;
    	let t72;
    	let ul5;
    	let li20;
    	let t73;
    	let img4;
    	let img4_src_value;
    	let t74;
    	let li21;
    	let t76;
    	let li22;
    	let t77;
    	let img5;
    	let img5_src_value;
    	let t78;
    	let h12;
    	let t80;
    	let h36;
    	let t82;
    	let ul6;
    	let li23;
    	let t83;
    	let img6;
    	let img6_src_value;
    	let t84;
    	let li24;
    	let t85;
    	let img7;
    	let img7_src_value;
    	let t86;
    	let li25;
    	let t87;
    	let img8;
    	let img8_src_value;
    	let t88;
    	let h13;
    	let t90;
    	let ul7;
    	let li26;
    	let t91;
    	let img9;
    	let img9_src_value;
    	let t92;
    	let li27;
    	let t93;
    	let img10;
    	let img10_src_value;
    	let t94;
    	let li28;
    	let t95;
    	let img11;
    	let img11_src_value;
    	let t96;
    	let h14;
    	let t98;
    	let ul8;
    	let li29;
    	let t99;
    	let img12;
    	let img12_src_value;
    	let t100;
    	let li30;
    	let t101;
    	let img13;
    	let img13_src_value;
    	let t102;
    	let li31;
    	let t103;
    	let img14;
    	let img14_src_value;
    	let t104;
    	let li32;
    	let t105;
    	let img15;
    	let img15_src_value;
    	let t106;
    	let li33;
    	let t107;
    	let img16;
    	let img16_src_value;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Data Collection and preparation";
    			t1 = space();
    			h2 = element("h2");
    			h2.textContent = "Data Collection";
    			t3 = space();
    			h30 = element("h3");
    			h30.textContent = "Considerations about the topic";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "As the Information about the female menstrual cycle is personal\n        information, it was really hard to find any datasets about it. Due to\n        this problem, the aggregated data is rather small - which shouldn't be a\n        big problem.";
    			t7 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "As I am already familiar with the topic of the menstrual cycle and\n            natural contraception, I thought this could be a great topic,\n            because there is a lot of data to analyse!";
    			t9 = space();
    			li1 = element("li");
    			li1.textContent = "While working on the project I noticed, that this topic may not be\n            the best one for KI-models. To be fair, there is a big amount of\n            data to analyse, but the target values don't have a long bandwith. A\n            cycle is approx 28 days, a menstration is approx. 5 days and the\n            ouvlation day is approx. on day 14. Additionally, the accuracy of\n            the model should be really high, as I have the target value 'first\n            day of high', which is the ovulation day. This is theoretically the\n            day, that afterwards the woman can't get pregnant anymore. That's\n            why I will take into consideration, if the predicted values differ\n            from the mean of the target variable.";
    			t11 = space();
    			li2 = element("li");
    			li2.textContent = "So I will analyse, if the KI-models are actually of value in this\n            topic!";
    			t13 = space();
    			li3 = element("li");
    			li3.textContent = "Because the target variable doesn't change that much, we don't\n            necessarily need a large dataset - all the datapoints + the value to\n            predict are approx. in the same range. So we would either need a\n            huge dataset to bring the accuracy as low as possible, or we use a\n            rather small dataset and make predictions. I am doing the second\n            one, as I don't have that many datapoints.";
    			t15 = space();
    			h31 = element("h3");
    			h31.textContent = "Considerations about the data";
    			t17 = space();
    			p1 = element("p");
    			p1.textContent = "When analysing the data, the following points are outstanding:";
    			t19 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			li4.textContent = "The data type of all columns is exclusively numeric";
    			t21 = space();
    			li5 = element("li");
    			li5.textContent = "We are calculating full cycle days. This means, that we are working\n            exclusively with INT values, normally between 0-30";
    			t23 = space();
    			li6 = element("li");
    			li6.textContent = "There is a difference between the cycle length and the cycle day.\n            For the training of the model, we will use exclusively the cycle\n            dataset.";
    			t25 = space();
    			li7 = element("li");
    			li7.textContent = "Women often track their cycles in relation to get pregnant. This\n            also means, it can be used as a natural contraception method. All\n            datapoints have been aggregated in which the women have tracked\n            their period in order to have a natural contraception method. This\n            means, that the dataset also contains valuable information and many\n            further aspects of getting pregnant / not getting pregnant. This\n            also explains to why the Kaggle Dataset contains 80 Columns! I will\n            only use approx. 10 variables of all the datasets.";
    			t27 = space();
    			li8 = element("li");
    			li8.textContent = "I would have liked to analyse the correlation between moonphases or\n            moodswings and the cycle, but as my largest dataset (Kaggle) doesn't\n            have any points like location / date / time, it was not possible to\n            add further information. (I have no linking variable)";
    			t29 = space();
    			div0 = element("div");
    			t30 = space();
    			h32 = element("h3");
    			h32.textContent = "FedCycleData071012.csv";
    			t32 = space();
    			ul2 = element("ul");
    			li9 = element("li");
    			t33 = text("The data was imported from this Kaggle dataset: ");
    			a0 = element("a");
    			a0.textContent = "Menstrual Cycle Data";
    			t35 = space();
    			li10 = element("li");
    			li10.textContent = "The data contains 159 women";
    			t37 = space();
    			li11 = element("li");
    			li11.textContent = "The data contains 1665 cyles (approx. 1 month) of 159 women";
    			t39 = space();
    			li12 = element("li");
    			t40 = text("The clientID have the value 'nfp' in it. This is actually a natural\n            contraception method called 'natürliche Familenplanung': ");
    			a1 = element("a");
    			a1.textContent = "NFP";
    			t42 = space();
    			div1 = element("div");
    			t43 = space();
    			div2 = element("div");
    			img0 = element("img");
    			t44 = space();
    			h33 = element("h3");
    			h33.textContent = "cycles.csv";
    			t46 = space();
    			ul3 = element("ul");
    			li13 = element("li");
    			li13.textContent = "This is a csv file from my 'myNFP' App. It doesn't have a lot of\n            entries, as the app was not possible to download in switzerland for\n            a period of time. Thats why I started with this app some months ago.";
    			t48 = space();
    			li14 = element("li");
    			li14.textContent = "I had to do a lot of cleaning, as there were multiple datapoints,\n            that were too much in detail";
    			t50 = space();
    			li15 = element("li");
    			li15.textContent = "For the natural contraception there are 3 factors to consider: The\n            temarature, the mucus and the feeling of the cervix (it can be hard\n            or soft). In the Kaggle dataset, this entries were already cleaned.\n            That's what I had to do with mine. All the unnecessary datapoints\n            were cleaned.";
    			t52 = space();
    			div3 = element("div");
    			t53 = space();
    			div4 = element("div");
    			img1 = element("img");
    			t54 = space();
    			h34 = element("h3");
    			h34.textContent = "Red Folder";
    			t56 = space();
    			ul4 = element("ul");
    			li16 = element("li");
    			li16.textContent = "The dataset is being used in the fine tuning of the Model and not in\n            the data preparation step";
    			t58 = space();
    			li17 = element("li");
    			li17.textContent = "The dataset contains the cycles from my mother for a bit more than a\n            year.";
    			t60 = space();
    			li18 = element("li");
    			li18.textContent = "Because the data is not digitalised, I created a new dataframe in\n            the jupiter notebook and put the data directly into the df.";
    			t62 = space();
    			p2 = element("p");
    			t63 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t64 = space();
    			p3 = element("p");
    			t65 = space();
    			li19 = element("li");
    			t66 = text("This is the digitalised version in the df:\n            ");
    			p4 = element("p");
    			t67 = space();
    			div6 = element("div");
    			img3 = element("img");
    			t68 = space();
    			h11 = element("h1");
    			h11.textContent = "Data Preparation";
    			t70 = space();
    			h35 = element("h3");
    			h35.textContent = "FedCycleData071012.csv";
    			t72 = space();
    			ul5 = element("ul");
    			li20 = element("li");
    			t73 = text("At first, the colums were specified and put into a numeric value:\n            ");
    			img4 = element("img");
    			t74 = space();
    			li21 = element("li");
    			li21.textContent = "Then, I had to clean the attributes of the women (Age, Weight,\n            Height, BMI + NumberPreg). So the problem was: If a woman has 10\n            cycles in the dataset, this are 10 rows. But the attributes of the\n            women were only in the first row documented. So I had to copy the\n            values of the Age row, until there is a new Row with already a value\n            filled out -> this would be the next woman. (Age Before: [36, 0, 0,\n            0, 55, 0, 0] Age After: [36, 36, 36, 36, 55, 55, 55])";
    			t76 = space();
    			li22 = element("li");
    			t77 = text("For Height and Weight I also changed the variables to the metric\n            System.\n            ");
    			img5 = element("img");
    			t78 = space();
    			h12 = element("h1");
    			h12.textContent = "Data Aggregation";
    			t80 = space();
    			h36 = element("h3");
    			h36.textContent = "cycles.csv";
    			t82 = space();
    			ul6 = element("ul");
    			li23 = element("li");
    			t83 = text("For my own data I had to clean at first the headers of the columns I\n            wanted to use and dump the ones I didn't need:\n            ");
    			img6 = element("img");
    			t84 = space();
    			li24 = element("li");
    			t85 = text("Then, I filled out the columns of the ones I knew my data (Age,\n            Weight, etc.)\n            ");
    			img7 = element("img");
    			t86 = space();
    			li25 = element("li");
    			t87 = text("And I merged the 2 files (I used concat as there are more\n            data-rows):\n            ");
    			img8 = element("img");
    			t88 = space();
    			h13 = element("h1");
    			h13.textContent = "Data Cleaning";
    			t90 = space();
    			ul7 = element("ul");
    			li26 = element("li");
    			t91 = text("Then, same old with missing values and duplicated values:\n            ");
    			img9 = element("img");
    			t92 = space();
    			li27 = element("li");
    			t93 = text("Missing values were filled in with the median value:\n            ");
    			img10 = element("img");
    			t94 = space();
    			li28 = element("li");
    			t95 = text("Which can also be done by the Imputer:\n            ");
    			img11 = element("img");
    			t96 = space();
    			h14 = element("h1");
    			h14.textContent = "Feature Engineering";
    			t98 = space();
    			ul8 = element("ul");
    			li29 = element("li");
    			t99 = text("I created a new category for the cycle length. This, so that it can\n            be determined, if the cycle length was short, normal or long:\n            ");
    			img12 = element("img");
    			t100 = space();
    			li30 = element("li");
    			t101 = text("Same for Length of Menses:\n            ");
    			img13 = element("img");
    			t102 = space();
    			li31 = element("li");
    			t103 = text("Then, I also wanted to analyse each day of the cycle. This due to\n            the fact, that I wanted to prognose at first in which phase of the\n            cycle a woman is. That's why I splitted the dataset (Before: 1 row =\n            1 Cycle; After: 1 row = 1 Cycle Day):\n            ");
    			img14 = element("img");
    			t104 = space();
    			li32 = element("li");
    			t105 = text("Then I also created a label that each day can be associated to a\n            cycle phase:\n            ");
    			img15 = element("img");
    			t106 = space();
    			li33 = element("li");
    			t107 = text("And lastly export the file:\n            ");
    			img16 = element("img");
    			add_location(h10, file$4, 6, 4, 120);
    			add_location(h2, file$4, 7, 4, 165);
    			add_location(h30, file$4, 8, 4, 194);
    			add_location(p0, file$4, 9, 4, 238);
    			add_location(li0, file$4, 17, 8, 521);
    			add_location(li1, file$4, 22, 8, 756);
    			add_location(li2, file$4, 34, 8, 1541);
    			add_location(li3, file$4, 38, 8, 1665);
    			add_location(ul0, file$4, 16, 4, 508);
    			add_location(h31, file$4, 48, 4, 2143);
    			add_location(p1, file$4, 50, 4, 2187);
    			add_location(li4, file$4, 52, 8, 2274);
    			add_location(li5, file$4, 53, 8, 2343);
    			add_location(li6, file$4, 57, 8, 2513);
    			add_location(li7, file$4, 62, 8, 2716);
    			add_location(li8, file$4, 72, 8, 3353);
    			add_location(ul1, file$4, 51, 4, 2261);
    			attr_dev(div0, "class", "col-md-8");
    			add_location(div0, file$4, 80, 4, 3694);
    			add_location(h32, file$4, 82, 4, 3724);
    			attr_dev(a0, "href", "https://www.kaggle.com/datasets/nikitabisht/menstrual-cycle-data");
    			add_location(a0, file$4, 85, 60, 3838);
    			add_location(li9, file$4, 84, 8, 3773);
    			add_location(li10, file$4, 90, 8, 4006);
    			add_location(li11, file$4, 91, 8, 4051);
    			attr_dev(a1, "href", "https://www.mynfp.de/nfp-regeln");
    			add_location(a1, file$4, 94, 69, 4282);
    			add_location(li12, file$4, 92, 8, 4128);
    			attr_dev(div1, "class", "col-md-8");
    			add_location(div1, file$4, 99, 8, 4384);
    			if (!src_url_equal(img0.src, img0_src_value = "pictures/kaggle.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "rounded mx-auto d-block");
    			attr_dev(img0, "alt", "...");
    			add_location(img0, file$4, 101, 12, 4473);
    			attr_dev(div2, "class", "row justify-content-md-center");
    			add_location(div2, file$4, 100, 8, 4417);
    			add_location(ul2, file$4, 83, 4, 3760);
    			add_location(h33, file$4, 109, 4, 4639);
    			add_location(li13, file$4, 111, 8, 4676);
    			add_location(li14, file$4, 116, 8, 4941);
    			add_location(li15, file$4, 120, 8, 5087);
    			attr_dev(div3, "class", "col-md-8");
    			add_location(div3, file$4, 128, 8, 5458);
    			if (!src_url_equal(img1.src, img1_src_value = "pictures/salome.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "rounded mx-auto d-block");
    			attr_dev(img1, "alt", "...");
    			add_location(img1, file$4, 130, 12, 5547);
    			attr_dev(div4, "class", "row justify-content-md-center");
    			add_location(div4, file$4, 129, 8, 5491);
    			add_location(ul3, file$4, 110, 4, 4663);
    			add_location(h34, file$4, 138, 4, 5713);
    			add_location(li16, file$4, 140, 8, 5750);
    			add_location(li17, file$4, 144, 8, 5896);
    			add_location(li18, file$4, 148, 8, 6022);
    			add_location(p2, file$4, 152, 8, 6199);
    			if (!src_url_equal(img2.src, img2_src_value = "pictures/mueter.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "rounded mx-auto d-block");
    			attr_dev(img2, "alt", "...");
    			add_location(img2, file$4, 154, 12, 6269);
    			attr_dev(div5, "class", "row justify-content-md-center");
    			add_location(div5, file$4, 153, 8, 6213);
    			add_location(p3, file$4, 160, 8, 6428);
    			add_location(p4, file$4, 164, 12, 6515);
    			add_location(li19, file$4, 162, 8, 6443);
    			if (!src_url_equal(img3.src, img3_src_value = "pictures/mueter_df.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "rounded mx-auto d-block");
    			attr_dev(img3, "alt", "...");
    			add_location(img3, file$4, 168, 12, 6600);
    			attr_dev(div6, "class", "row justify-content-md-center");
    			add_location(div6, file$4, 167, 8, 6544);
    			add_location(ul4, file$4, 139, 4, 5737);
    			add_location(h11, file$4, 176, 4, 6769);
    			add_location(h35, file$4, 177, 4, 6799);
    			if (!src_url_equal(img4.src, img4_src_value = "pictures/kaggle_dtype.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "rounded mx-auto d-block");
    			attr_dev(img4, "alt", "...");
    			add_location(img4, file$4, 181, 12, 6943);
    			add_location(li20, file$4, 179, 8, 6848);
    			add_location(li21, file$4, 187, 8, 7107);
    			if (!src_url_equal(img5.src, img5_src_value = "pictures/kaggle_attributes.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "rounded mx-auto d-block");
    			attr_dev(img5, "alt", "...");
    			add_location(img5, file$4, 199, 12, 7784);
    			add_location(li22, file$4, 196, 8, 7670);
    			add_location(ul5, file$4, 178, 4, 6835);
    			add_location(h12, file$4, 207, 4, 7960);
    			add_location(h36, file$4, 209, 4, 7991);
    			if (!src_url_equal(img6.src, img6_src_value = "pictures/salome_cleansing.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "rounded mx-auto d-block");
    			attr_dev(img6, "alt", "...");
    			add_location(img6, file$4, 215, 12, 8186);
    			add_location(li23, file$4, 212, 8, 8029);
    			if (!src_url_equal(img7.src, img7_src_value = "pictures/salome_aggr.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "rounded mx-auto d-block");
    			attr_dev(img7, "alt", "...");
    			add_location(img7, file$4, 225, 12, 8474);
    			add_location(li24, file$4, 222, 8, 8355);
    			if (!src_url_equal(img8.src, img8_src_value = "pictures/salome_merge.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "class", "rounded mx-auto d-block");
    			attr_dev(img8, "alt", "...");
    			add_location(img8, file$4, 234, 12, 8748);
    			add_location(li25, file$4, 231, 8, 8637);
    			add_location(ul6, file$4, 211, 4, 8016);
    			add_location(h13, file$4, 242, 4, 8919);
    			if (!src_url_equal(img9.src, img9_src_value = "pictures/cleaning_missing.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "class", "rounded mx-auto d-block");
    			attr_dev(img9, "alt", "...");
    			add_location(img9, file$4, 246, 12, 9046);
    			add_location(li26, file$4, 244, 8, 8959);
    			if (!src_url_equal(img10.src, img10_src_value = "pictures/cleaning_fillna.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "rounded mx-auto d-block");
    			attr_dev(img10, "alt", "...");
    			add_location(img10, file$4, 255, 12, 9297);
    			add_location(li27, file$4, 253, 8, 9215);
    			if (!src_url_equal(img11.src, img11_src_value = "pictures/cleaning_imputer.jpg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "class", "rounded mx-auto d-block");
    			attr_dev(img11, "alt", "...");
    			add_location(img11, file$4, 263, 12, 9532);
    			add_location(li28, file$4, 261, 8, 9464);
    			add_location(ul7, file$4, 243, 4, 8946);
    			add_location(h14, file$4, 271, 4, 9707);
    			if (!src_url_equal(img12.src, img12_src_value = "pictures/feature_cycle.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "class", "rounded mx-auto d-block");
    			attr_dev(img12, "alt", "...");
    			add_location(img12, file$4, 276, 12, 9924);
    			add_location(li29, file$4, 273, 8, 9753);
    			if (!src_url_equal(img13.src, img13_src_value = "pictures/feature_menses.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "class", "rounded mx-auto d-block");
    			attr_dev(img13, "alt", "...");
    			add_location(img13, file$4, 285, 12, 10146);
    			add_location(li30, file$4, 283, 8, 10090);
    			if (!src_url_equal(img14.src, img14_src_value = "pictures/feature_splitting.jpg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "class", "rounded mx-auto d-block");
    			attr_dev(img14, "alt", "...");
    			add_location(img14, file$4, 296, 12, 10617);
    			add_location(li31, file$4, 291, 8, 10312);
    			if (!src_url_equal(img15.src, img15_src_value = "pictures/feature_phase.jpg")) attr_dev(img15, "src", img15_src_value);
    			attr_dev(img15, "class", "rounded mx-auto d-block");
    			attr_dev(img15, "alt", "...");
    			add_location(img15, file$4, 305, 12, 10905);
    			add_location(li32, file$4, 302, 8, 10786);
    			if (!src_url_equal(img16.src, img16_src_value = "pictures/export.jpg")) attr_dev(img16, "src", img16_src_value);
    			attr_dev(img16, "class", "rounded mx-auto d-block");
    			attr_dev(img16, "alt", "...");
    			add_location(img16, file$4, 313, 12, 11127);
    			add_location(li33, file$4, 311, 8, 11070);
    			add_location(ul8, file$4, 272, 4, 9740);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file$4, 5, 0, 92);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, h10);
    			append_dev(div7, t1);
    			append_dev(div7, h2);
    			append_dev(div7, t3);
    			append_dev(div7, h30);
    			append_dev(div7, t5);
    			append_dev(div7, p0);
    			append_dev(div7, t7);
    			append_dev(div7, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t9);
    			append_dev(ul0, li1);
    			append_dev(ul0, t11);
    			append_dev(ul0, li2);
    			append_dev(ul0, t13);
    			append_dev(ul0, li3);
    			append_dev(div7, t15);
    			append_dev(div7, h31);
    			append_dev(div7, t17);
    			append_dev(div7, p1);
    			append_dev(div7, t19);
    			append_dev(div7, ul1);
    			append_dev(ul1, li4);
    			append_dev(ul1, t21);
    			append_dev(ul1, li5);
    			append_dev(ul1, t23);
    			append_dev(ul1, li6);
    			append_dev(ul1, t25);
    			append_dev(ul1, li7);
    			append_dev(ul1, t27);
    			append_dev(ul1, li8);
    			append_dev(div7, t29);
    			append_dev(div7, div0);
    			append_dev(div7, t30);
    			append_dev(div7, h32);
    			append_dev(div7, t32);
    			append_dev(div7, ul2);
    			append_dev(ul2, li9);
    			append_dev(li9, t33);
    			append_dev(li9, a0);
    			append_dev(ul2, t35);
    			append_dev(ul2, li10);
    			append_dev(ul2, t37);
    			append_dev(ul2, li11);
    			append_dev(ul2, t39);
    			append_dev(ul2, li12);
    			append_dev(li12, t40);
    			append_dev(li12, a1);
    			append_dev(ul2, t42);
    			append_dev(ul2, div1);
    			append_dev(ul2, t43);
    			append_dev(ul2, div2);
    			append_dev(div2, img0);
    			append_dev(div7, t44);
    			append_dev(div7, h33);
    			append_dev(div7, t46);
    			append_dev(div7, ul3);
    			append_dev(ul3, li13);
    			append_dev(ul3, t48);
    			append_dev(ul3, li14);
    			append_dev(ul3, t50);
    			append_dev(ul3, li15);
    			append_dev(ul3, t52);
    			append_dev(ul3, div3);
    			append_dev(ul3, t53);
    			append_dev(ul3, div4);
    			append_dev(div4, img1);
    			append_dev(div7, t54);
    			append_dev(div7, h34);
    			append_dev(div7, t56);
    			append_dev(div7, ul4);
    			append_dev(ul4, li16);
    			append_dev(ul4, t58);
    			append_dev(ul4, li17);
    			append_dev(ul4, t60);
    			append_dev(ul4, li18);
    			append_dev(ul4, t62);
    			append_dev(ul4, p2);
    			append_dev(ul4, t63);
    			append_dev(ul4, div5);
    			append_dev(div5, img2);
    			append_dev(ul4, t64);
    			append_dev(ul4, p3);
    			append_dev(ul4, t65);
    			append_dev(ul4, li19);
    			append_dev(li19, t66);
    			append_dev(li19, p4);
    			append_dev(ul4, t67);
    			append_dev(ul4, div6);
    			append_dev(div6, img3);
    			append_dev(div7, t68);
    			append_dev(div7, h11);
    			append_dev(div7, t70);
    			append_dev(div7, h35);
    			append_dev(div7, t72);
    			append_dev(div7, ul5);
    			append_dev(ul5, li20);
    			append_dev(li20, t73);
    			append_dev(li20, img4);
    			append_dev(ul5, t74);
    			append_dev(ul5, li21);
    			append_dev(ul5, t76);
    			append_dev(ul5, li22);
    			append_dev(li22, t77);
    			append_dev(li22, img5);
    			append_dev(div7, t78);
    			append_dev(div7, h12);
    			append_dev(div7, t80);
    			append_dev(div7, h36);
    			append_dev(div7, t82);
    			append_dev(div7, ul6);
    			append_dev(ul6, li23);
    			append_dev(li23, t83);
    			append_dev(li23, img6);
    			append_dev(ul6, t84);
    			append_dev(ul6, li24);
    			append_dev(li24, t85);
    			append_dev(li24, img7);
    			append_dev(ul6, t86);
    			append_dev(ul6, li25);
    			append_dev(li25, t87);
    			append_dev(li25, img8);
    			append_dev(div7, t88);
    			append_dev(div7, h13);
    			append_dev(div7, t90);
    			append_dev(div7, ul7);
    			append_dev(ul7, li26);
    			append_dev(li26, t91);
    			append_dev(li26, img9);
    			append_dev(ul7, t92);
    			append_dev(ul7, li27);
    			append_dev(li27, t93);
    			append_dev(li27, img10);
    			append_dev(ul7, t94);
    			append_dev(ul7, li28);
    			append_dev(li28, t95);
    			append_dev(li28, img11);
    			append_dev(div7, t96);
    			append_dev(div7, h14);
    			append_dev(div7, t98);
    			append_dev(div7, ul8);
    			append_dev(ul8, li29);
    			append_dev(li29, t99);
    			append_dev(li29, img12);
    			append_dev(ul8, t100);
    			append_dev(ul8, li30);
    			append_dev(li30, t101);
    			append_dev(li30, img13);
    			append_dev(ul8, t102);
    			append_dev(ul8, li31);
    			append_dev(li31, t103);
    			append_dev(li31, img14);
    			append_dev(ul8, t104);
    			append_dev(ul8, li32);
    			append_dev(li32, t105);
    			append_dev(li32, img15);
    			append_dev(ul8, t106);
    			append_dev(ul8, li33);
    			append_dev(li33, t107);
    			append_dev(li33, img16);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Data', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Data> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ base_url, axios: axios$1 });
    	return [];
    }

    class Data extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Data",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/pages/Motivation.svelte generated by Svelte v3.55.1 */
    const file$3 = "src/pages/Motivation.svelte";

    function create_fragment$3(ctx) {
    	let h1;
    	let t1;
    	let h20;
    	let t3;
    	let div9;
    	let div2;
    	let h21;
    	let button0;
    	let t5;
    	let div1;
    	let div0;
    	let h40;
    	let t7;
    	let ul0;
    	let li0;
    	let t9;
    	let li1;
    	let t11;
    	let li2;
    	let t13;
    	let li3;
    	let t15;
    	let li4;
    	let t17;
    	let li5;
    	let t19;
    	let li6;
    	let t21;
    	let p0;
    	let t22;
    	let img0;
    	let img0_src_value;
    	let t23;
    	let h41;
    	let t25;
    	let ul1;
    	let li7;
    	let t27;
    	let li8;
    	let t29;
    	let li9;
    	let t31;
    	let div5;
    	let h22;
    	let button1;
    	let t33;
    	let div4;
    	let div3;
    	let h42;
    	let t35;
    	let ul2;
    	let li10;
    	let t36;
    	let a;
    	let t38;
    	let li11;
    	let t40;
    	let li12;
    	let t42;
    	let li13;
    	let t44;
    	let li14;
    	let t46;
    	let li15;
    	let t48;
    	let li16;
    	let t50;
    	let li17;
    	let t52;
    	let p1;
    	let t53;
    	let img1;
    	let img1_src_value;
    	let t54;
    	let div8;
    	let h23;
    	let button2;
    	let t56;
    	let div7;
    	let div6;
    	let h43;
    	let t58;
    	let ul3;
    	let li18;
    	let t60;
    	let li19;
    	let t62;
    	let li20;
    	let t64;
    	let li21;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Motivation";
    			t1 = space();
    			h20 = element("h2");
    			h20.textContent = "Problem Statement";
    			t3 = space();
    			div9 = element("div");
    			div2 = element("div");
    			h21 = element("h2");
    			button0 = element("button");
    			button0.textContent = "End users";
    			t5 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Considerations";
    			t7 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "The End Users of this application are women that\n                        have an active menstrual cycle";
    			t9 = space();
    			li1 = element("li");
    			li1.textContent = "The women must be in a post-puberty state and before\n                        the menopause. (approx. Age between 14 - 50)";
    			t11 = space();
    			li2 = element("li");
    			li2.textContent = "Pregnant woman also can't be included, as they\n                        normally don't have their period.";
    			t13 = space();
    			li3 = element("li");
    			li3.textContent = "The women must be biologically female";
    			t15 = space();
    			li4 = element("li");
    			li4.textContent = "The menstrual cycle doesn't has to be constant. It's\n                        important, that the women have a cycle. Especially\n                        after discontinuing a hormonal contraception method,\n                        the menstrual cycle can be quite irregular. This is\n                        not a problem. But if the person doesn't have the\n                        menstruation at all, the prediction will not work,\n                        as there is no active cycle.";
    			t17 = space();
    			li5 = element("li");
    			li5.textContent = "Also, the women want to know how their body works\n                        and is interested to learn about the menstrual cycle\n                        / is already familiar";
    			t19 = space();
    			li6 = element("li");
    			li6.textContent = "There are already quite a lot of contraceptives. The\n                        tracking of the menstrual cycle doesn't has to be\n                        for a contraception method. It can also be done\n                        additionally to another contraception method just to\n                        get to know in what cycle phase the body is right\n                        now.";
    			t21 = space();
    			p0 = element("p");
    			t22 = space();
    			img0 = element("img");
    			t23 = space();
    			h41 = element("h4");
    			h41.textContent = "Final End Users:";
    			t25 = space();
    			ul1 = element("ul");
    			li7 = element("li");
    			li7.textContent = "Women that don't want to get pregnant";
    			t27 = space();
    			li8 = element("li");
    			li8.textContent = "Women that want to get pregnant";
    			t29 = space();
    			li9 = element("li");
    			li9.textContent = "Women that want to get to know their body better";
    			t31 = space();
    			div5 = element("div");
    			h22 = element("h2");
    			button1 = element("button");
    			button1.textContent = "Goals of end users";
    			t33 = space();
    			div4 = element("div");
    			div3 = element("div");
    			h42 = element("h4");
    			h42.textContent = "Goals of end users";
    			t35 = space();
    			ul2 = element("ul");
    			li10 = element("li");
    			t36 = text("There are studies that show the impact of the\n                        menstrual cycle in relation to sport: ");
    			a = element("a");
    			a.textContent = "Study";
    			t38 = space();
    			li11 = element("li");
    			li11.textContent = "The menstrual cycle is influencing the thoughts,\n                        feelings and body (temparature, skin, etc.) of\n                        women. So the body is giving clear indication to how\n                        a woman can expect to feel each day. So why not\n                        listen to it?";
    			t40 = space();
    			li12 = element("li");
    			li12.textContent = "The standard Cycle Length is 28 days and the\n                        Ovulation day is the most important one. It is one\n                        single day, that the female body can actually get\n                        pregnant (apart from the 5 days where sperm can\n                        survive in the uterus)";
    			t42 = space();
    			li13 = element("li");
    			li13.textContent = "The women's goal is to get a prediction, to when\n                        this day most likely will occur.";
    			t44 = space();
    			li14 = element("li");
    			li14.textContent = "For women that don't want to get pregnant: After\n                        this day, it is theoretically safe";
    			t46 = space();
    			li15 = element("li");
    			li15.textContent = "For women that want to get pregnant: Before this day\n                        and up to 5 days before the chances to get pregnant\n                        are highest";
    			t48 = space();
    			li16 = element("li");
    			li16.textContent = "For women that want to get to know their body\n                        better: This is the best phase of the whole cycle,\n                        as the mood is great and body as well";
    			t50 = space();
    			li17 = element("li");
    			li17.textContent = "By getting a prediction about the Ovulation date, the daily routines can be adjusted accordingly. For example: Heavy workouts should be planned around the ovulation date.";
    			t52 = space();
    			p1 = element("p");
    			t53 = space();
    			img1 = element("img");
    			t54 = space();
    			div8 = element("div");
    			h23 = element("h2");
    			button2 = element("button");
    			button2.textContent = "Obstacle to be solved";
    			t56 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h43 = element("h4");
    			h43.textContent = "Obstacle to be solved";
    			t58 = space();
    			ul3 = element("ul");
    			li18 = element("li");
    			li18.textContent = "With the model women can predict the day that they are ovulating";
    			t60 = space();
    			li19 = element("li");
    			li19.textContent = "According to the prediction, daily activities can be planned";
    			t62 = space();
    			li20 = element("li");
    			li20.textContent = "Also, it's being analysed, if factors like age or weight/height have influence to the prediction.";
    			t64 = space();
    			li21 = element("li");
    			li21.textContent = "Does the prediction differ a lot from the mean of the Ovulation Day 12?";
    			add_location(h1, file$3, 5, 4, 96);
    			add_location(h20, file$3, 6, 4, 120);
    			attr_dev(button0, "class", "accordion-button svelte-1vj9bvn");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "data-bs-toggle", "collapse");
    			attr_dev(button0, "data-bs-target", "#panelsStayOpen-collapseOne");
    			attr_dev(button0, "aria-expanded", "true");
    			attr_dev(button0, "aria-controls", "panelsStayOpen-collapseOne");
    			add_location(button0, file$3, 12, 12, 333);
    			attr_dev(h21, "class", "accordion-header");
    			attr_dev(h21, "id", "panelsStayOpen-headingOne");
    			add_location(h21, file$3, 11, 10, 260);
    			add_location(h40, file$3, 18, 16, 768);
    			add_location(li0, file$3, 20, 20, 833);
    			add_location(li1, file$3, 24, 20, 1012);
    			add_location(li2, file$3, 28, 20, 1209);
    			add_location(li3, file$3, 32, 20, 1389);
    			add_location(li4, file$3, 33, 20, 1456);
    			add_location(li5, file$3, 42, 20, 2014);
    			add_location(li6, file$3, 47, 20, 2262);
    			add_location(p0, file$3, 56, 20, 2717);
    			if (!src_url_equal(img0.src, img0_src_value = "pictures/contraception.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "rounded mx-auto d-block");
    			set_style(img0, "width", "600px");
    			set_style(img0, "height", "auto");
    			attr_dev(img0, "alt", "...");
    			add_location(img0, file$3, 57, 20, 2743);
    			add_location(ul0, file$3, 19, 16, 808);
    			add_location(h41, file$3, 65, 16, 3017);
    			add_location(li7, file$3, 67, 20, 3084);
    			add_location(li8, file$3, 68, 20, 3151);
    			add_location(li9, file$3, 69, 20, 3212);
    			add_location(ul1, file$3, 66, 16, 3059);
    			attr_dev(div0, "class", "accordion-body svelte-1vj9bvn");
    			add_location(div0, file$3, 17, 12, 723);
    			attr_dev(div1, "id", "panelsStayOpen-collapseOne");
    			attr_dev(div1, "class", "accordion-collapse collapse show");
    			attr_dev(div1, "aria-labelledby", "panelsStayOpen-headingOne");
    			add_location(div1, file$3, 16, 10, 588);
    			attr_dev(div2, "class", "accordion-item");
    			add_location(div2, file$3, 10, 8, 221);
    			attr_dev(button1, "class", "accordion-button collapsed svelte-1vj9bvn");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-bs-toggle", "collapse");
    			attr_dev(button1, "data-bs-target", "#panelsStayOpen-collapseTwo");
    			attr_dev(button1, "aria-expanded", "false");
    			attr_dev(button1, "aria-controls", "panelsStayOpen-collapseTwo");
    			add_location(button1, file$3, 79, 12, 3510);
    			attr_dev(h22, "class", "accordion-header");
    			attr_dev(h22, "id", "panelsStayOpen-headingTwo");
    			add_location(h22, file$3, 78, 10, 3437);
    			add_location(h42, file$3, 85, 16, 3962);
    			attr_dev(a, "href", "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7916245/");
    			add_location(a, file$3, 89, 62, 4168);
    			add_location(li10, file$3, 87, 20, 4031);
    			add_location(li11, file$3, 94, 20, 4370);
    			add_location(li12, file$3, 101, 20, 4752);
    			add_location(li13, file$3, 108, 20, 5140);
    			add_location(li14, file$3, 112, 20, 5321);
    			add_location(li15, file$3, 116, 20, 5504);
    			add_location(li16, file$3, 121, 20, 5744);
    			add_location(li17, file$3, 126, 20, 6002);
    			add_location(p1, file$3, 130, 20, 6249);
    			if (!src_url_equal(img1.src, img1_src_value = "pictures/cycle_phases_mood.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "rounded mx-auto d-block");
    			attr_dev(img1, "alt", "...");
    			add_location(img1, file$3, 131, 20, 6275);
    			add_location(ul2, file$3, 86, 16, 4006);
    			attr_dev(div3, "class", "accordion-body svelte-1vj9bvn");
    			add_location(div3, file$3, 84, 12, 3917);
    			attr_dev(div4, "id", "panelsStayOpen-collapseTwo");
    			attr_dev(div4, "class", "accordion-collapse collapse");
    			attr_dev(div4, "aria-labelledby", "panelsStayOpen-headingTwo");
    			add_location(div4, file$3, 83, 10, 3787);
    			attr_dev(div5, "class", "accordion-item");
    			add_location(div5, file$3, 77, 8, 3398);
    			attr_dev(button2, "class", "accordion-button collapsed svelte-1vj9bvn");
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bs-toggle", "collapse");
    			attr_dev(button2, "data-bs-target", "#panelsStayOpen-collapseThree");
    			attr_dev(button2, "aria-expanded", "false");
    			attr_dev(button2, "aria-controls", "panelsStayOpen-collapseThree");
    			add_location(button2, file$3, 142, 12, 6643);
    			attr_dev(h23, "class", "accordion-header");
    			attr_dev(h23, "id", "panelsStayOpen-headingThree");
    			add_location(h23, file$3, 141, 10, 6568);
    			add_location(h43, file$3, 148, 16, 7106);
    			add_location(li18, file$3, 150, 20, 7178);
    			add_location(li19, file$3, 153, 20, 7318);
    			add_location(li20, file$3, 156, 20, 7454);
    			add_location(li21, file$3, 159, 20, 7627);
    			add_location(ul3, file$3, 149, 16, 7153);
    			attr_dev(div6, "class", "accordion-body svelte-1vj9bvn");
    			add_location(div6, file$3, 147, 12, 7061);
    			attr_dev(div7, "id", "panelsStayOpen-collapseThree");
    			attr_dev(div7, "class", "accordion-collapse collapse");
    			attr_dev(div7, "aria-labelledby", "panelsStayOpen-headingThree");
    			add_location(div7, file$3, 146, 10, 6927);
    			attr_dev(div8, "class", "accordion-item");
    			add_location(div8, file$3, 140, 8, 6529);
    			attr_dev(div9, "class", "accordion");
    			attr_dev(div9, "id", "accordionPanelsStayOpenExample");
    			add_location(div9, file$3, 9, 4, 153);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div2);
    			append_dev(div2, h21);
    			append_dev(h21, button0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h40);
    			append_dev(div0, t7);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t9);
    			append_dev(ul0, li1);
    			append_dev(ul0, t11);
    			append_dev(ul0, li2);
    			append_dev(ul0, t13);
    			append_dev(ul0, li3);
    			append_dev(ul0, t15);
    			append_dev(ul0, li4);
    			append_dev(ul0, t17);
    			append_dev(ul0, li5);
    			append_dev(ul0, t19);
    			append_dev(ul0, li6);
    			append_dev(ul0, t21);
    			append_dev(ul0, p0);
    			append_dev(ul0, t22);
    			append_dev(ul0, img0);
    			append_dev(div0, t23);
    			append_dev(div0, h41);
    			append_dev(div0, t25);
    			append_dev(div0, ul1);
    			append_dev(ul1, li7);
    			append_dev(ul1, t27);
    			append_dev(ul1, li8);
    			append_dev(ul1, t29);
    			append_dev(ul1, li9);
    			append_dev(div9, t31);
    			append_dev(div9, div5);
    			append_dev(div5, h22);
    			append_dev(h22, button1);
    			append_dev(div5, t33);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h42);
    			append_dev(div3, t35);
    			append_dev(div3, ul2);
    			append_dev(ul2, li10);
    			append_dev(li10, t36);
    			append_dev(li10, a);
    			append_dev(ul2, t38);
    			append_dev(ul2, li11);
    			append_dev(ul2, t40);
    			append_dev(ul2, li12);
    			append_dev(ul2, t42);
    			append_dev(ul2, li13);
    			append_dev(ul2, t44);
    			append_dev(ul2, li14);
    			append_dev(ul2, t46);
    			append_dev(ul2, li15);
    			append_dev(ul2, t48);
    			append_dev(ul2, li16);
    			append_dev(ul2, t50);
    			append_dev(ul2, li17);
    			append_dev(ul2, t52);
    			append_dev(ul2, p1);
    			append_dev(ul2, t53);
    			append_dev(ul2, img1);
    			append_dev(div9, t54);
    			append_dev(div9, div8);
    			append_dev(div8, h23);
    			append_dev(h23, button2);
    			append_dev(div8, t56);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h43);
    			append_dev(div6, t58);
    			append_dev(div6, ul3);
    			append_dev(ul3, li18);
    			append_dev(ul3, t60);
    			append_dev(ul3, li19);
    			append_dev(ul3, t62);
    			append_dev(ul3, li20);
    			append_dev(ul3, t64);
    			append_dev(ul3, li21);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Motivation', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Motivation> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ base_url, axios: axios$1 });
    	return [];
    }

    class Motivation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Motivation",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/pages/Training.svelte generated by Svelte v3.55.1 */
    const file$2 = "src/pages/Training.svelte";

    function create_fragment$2(ctx) {
    	let h10;
    	let t1;
    	let p;
    	let t3;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let h11;
    	let t6;
    	let ul0;
    	let li0;
    	let strong0;
    	let t8;
    	let t9;
    	let li1;
    	let strong1;
    	let t11;
    	let t12;
    	let li2;
    	let strong2;
    	let t14;
    	let t15;
    	let li3;
    	let strong3;
    	let t17;
    	let t18;
    	let li4;
    	let strong4;
    	let t20;
    	let t21;
    	let li5;
    	let strong5;
    	let t23;
    	let t24;
    	let li6;
    	let strong6;
    	let t26;
    	let t27;
    	let img1;
    	let img1_src_value;
    	let t28;
    	let h12;
    	let t30;
    	let h30;
    	let t32;
    	let ul1;
    	let li7;
    	let t34;
    	let li8;
    	let t36;
    	let li9;
    	let t38;
    	let img2;
    	let img2_src_value;
    	let t39;
    	let h31;
    	let t41;
    	let ul2;
    	let li10;
    	let t43;
    	let li11;
    	let t45;
    	let li12;
    	let t47;
    	let img3;
    	let img3_src_value;
    	let t48;
    	let h32;
    	let t50;
    	let ul3;
    	let li13;
    	let t52;
    	let li14;
    	let t54;
    	let li15;
    	let t56;
    	let img4;
    	let img4_src_value;

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			h10.textContent = "Model Training";
    			t1 = space();
    			p = element("p");
    			p.textContent = "For the Model comparison, I used the following models:";
    			t3 = space();
    			img0 = element("img");
    			t4 = space();
    			h11 = element("h1");
    			h11.textContent = "Fine Tuning";
    			t6 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			strong0 = element("strong");
    			strong0.textContent = "Get a more complex model";
    			t8 = text(": as the model already works very well with the\n        linear Regression model, the model itself is not the problem. But I\n        could search for a more complex problem, that has a bigger variety in\n        the data than this.");
    			t9 = space();
    			li1 = element("li");
    			strong1 = element("strong");
    			strong1.textContent = "Get more data";
    			t11 = text(": This is a possibility. I also have already added some\n        more data, but as my target Variable already doesn't vary that much,\n        there doesn't has to be a lot of more data. Also, I don't have more\n        information about date / time or location points, so I cannot add more\n        data (like moon phases or so)");
    			t12 = space();
    			li2 = element("li");
    			strong2 = element("strong");
    			strong2.textContent = "Feature engineering";
    			t14 = text(": As my values are already very stanardised and of\n        type int, there are not many options.");
    			t15 = space();
    			li3 = element("li");
    			strong3 = element("strong");
    			strong3.textContent = "Data cleaning";
    			t17 = text(": Not needed. Our dataset is already very clean and has\n        only int values");
    			t18 = space();
    			li4 = element("li");
    			strong4 = element("strong");
    			strong4.textContent = "Pipelines";
    			t20 = text(": Used in Poly Model");
    			t21 = space();
    			li5 = element("li");
    			strong5 = element("strong");
    			strong5.textContent = "Scaling";
    			t23 = text(": Done");
    			t24 = space();
    			li6 = element("li");
    			strong6 = element("strong");
    			strong6.textContent = "Grid Search";
    			t26 = text(": Done");
    			t27 = space();
    			img1 = element("img");
    			t28 = space();
    			h12 = element("h1");
    			h12.textContent = "Error analysis performance";
    			t30 = space();
    			h30 = element("h3");
    			h30.textContent = "RMSE";
    			t32 = space();
    			ul1 = element("ul");
    			li7 = element("li");
    			li7.textContent = "Already before any fine tuning was done, the model was already performing very well. This is due to the fact, that the predicted values dont't has a wide range. The ovulation day differs from approx. 10-15 (as stated in the Data collection section).";
    			t34 = space();
    			li8 = element("li");
    			li8.textContent = "Even with aggregating more data, perform the GridSearch, Scaling and look at the most important features, the model did improve only marginally.";
    			t36 = space();
    			li9 = element("li");
    			li9.textContent = "As our dataset only contains numeric values, we don't have unstructured data, that could influence our model";
    			t38 = space();
    			img2 = element("img");
    			t39 = space();
    			h31 = element("h3");
    			h31.textContent = "Original Hypothesis";
    			t41 = text("\nIn the Motivation Section, I defined the following hypothesis: Does the prediction differ a lot from the mean of the Ovulation Day 12?\n");
    			ul2 = element("ul");
    			li10 = element("li");
    			li10.textContent = "The following graph shows 20 samples with the predicted and observed data";
    			t43 = space();
    			li11 = element("li");
    			li11.textContent = "We can see, that our model is more accurate than the mean value of the target variable.";
    			t45 = space();
    			li12 = element("li");
    			li12.textContent = "However, we can also see, that the mean is pretty accurate. And doesn't differ a lot.";
    			t47 = space();
    			img3 = element("img");
    			t48 = space();
    			h32 = element("h3");
    			h32.textContent = "Is my model Over- or Underfitting?";
    			t50 = space();
    			ul3 = element("ul");
    			li13 = element("li");
    			li13.textContent = "Da die Testdaten im Vergleich zu den Traingingsdaten ziemlich ähnlich sind, kann davon ausgegangen werden, dass kein Overfitting der Fall ist im Modell.";
    			t52 = space();
    			li14 = element("li");
    			li14.textContent = "Und da generell der Error sehr tief ist, kann auch davon ausgegangen werden, dass kein Underfitting stattfindet (das Modell passt sehr gut, deswegen gibt es auch tiefe Differenzen/Residuals).";
    			t54 = space();
    			li15 = element("li");
    			li15.textContent = "So no, my model is fitting optimal!";
    			t56 = space();
    			img4 = element("img");
    			add_location(h10, file$2, 5, 0, 92);
    			add_location(p, file$2, 7, 0, 117);
    			if (!src_url_equal(img0.src, img0_src_value = "pictures/all_models.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "rounded mx-auto d-block");
    			set_style(img0, "width", "1000px");
    			set_style(img0, "height", "auto");
    			attr_dev(img0, "alt", "...");
    			add_location(img0, file$2, 9, 0, 180);
    			add_location(h11, file$2, 16, 0, 314);
    			add_location(strong0, file$2, 19, 8, 357);
    			add_location(li0, file$2, 18, 4, 344);
    			add_location(strong1, file$2, 25, 8, 655);
    			add_location(li1, file$2, 24, 4, 642);
    			add_location(strong2, file$2, 32, 8, 1038);
    			add_location(li2, file$2, 31, 4, 1025);
    			add_location(strong3, file$2, 36, 8, 1198);
    			add_location(li3, file$2, 35, 4, 1185);
    			add_location(strong4, file$2, 39, 8, 1326);
    			add_location(li4, file$2, 39, 4, 1322);
    			add_location(strong5, file$2, 40, 8, 1386);
    			add_location(li5, file$2, 40, 4, 1382);
    			add_location(strong6, file$2, 41, 8, 1430);
    			add_location(li6, file$2, 41, 4, 1426);
    			add_location(ul0, file$2, 17, 0, 335);
    			if (!src_url_equal(img1.src, img1_src_value = "pictures/module_final_rmse.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "rounded mx-auto d-block");
    			set_style(img1, "width", "1000px");
    			set_style(img1, "height", "auto");
    			attr_dev(img1, "alt", "...");
    			add_location(img1, file$2, 44, 0, 1477);
    			add_location(h12, file$2, 51, 0, 1618);
    			add_location(h30, file$2, 53, 0, 1655);
    			add_location(li7, file$2, 55, 4, 1678);
    			add_location(li8, file$2, 58, 4, 1955);
    			add_location(li9, file$2, 61, 4, 2127);
    			add_location(ul1, file$2, 54, 0, 1669);
    			if (!src_url_equal(img2.src, img2_src_value = "pictures/model_residual.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "rounded mx-auto d-block");
    			set_style(img2, "width", "1000px");
    			set_style(img2, "height", "auto");
    			attr_dev(img2, "alt", "...");
    			add_location(img2, file$2, 66, 0, 2266);
    			add_location(h31, file$2, 74, 0, 2405);
    			add_location(li10, file$2, 77, 4, 2578);
    			add_location(li11, file$2, 80, 4, 2679);
    			add_location(li12, file$2, 83, 4, 2794);
    			add_location(ul2, file$2, 76, 0, 2569);
    			if (!src_url_equal(img3.src, img3_src_value = "pictures/model_comparison.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "rounded mx-auto d-block");
    			set_style(img3, "width", "1000px");
    			set_style(img3, "height", "auto");
    			attr_dev(img3, "alt", "...");
    			add_location(img3, file$2, 87, 0, 2910);
    			add_location(h32, file$2, 94, 0, 3050);
    			add_location(li13, file$2, 97, 4, 3104);
    			add_location(li14, file$2, 100, 4, 3284);
    			add_location(li15, file$2, 103, 4, 3503);
    			add_location(ul3, file$2, 96, 0, 3095);
    			if (!src_url_equal(img4.src, img4_src_value = "pictures/model_train_test.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "rounded mx-auto d-block");
    			set_style(img4, "width", "1000px");
    			set_style(img4, "height", "auto");
    			attr_dev(img4, "alt", "...");
    			add_location(img4, file$2, 107, 0, 3569);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h10, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, img0, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, h11, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, ul0, anchor);
    			append_dev(ul0, li0);
    			append_dev(li0, strong0);
    			append_dev(li0, t8);
    			append_dev(ul0, t9);
    			append_dev(ul0, li1);
    			append_dev(li1, strong1);
    			append_dev(li1, t11);
    			append_dev(ul0, t12);
    			append_dev(ul0, li2);
    			append_dev(li2, strong2);
    			append_dev(li2, t14);
    			append_dev(ul0, t15);
    			append_dev(ul0, li3);
    			append_dev(li3, strong3);
    			append_dev(li3, t17);
    			append_dev(ul0, t18);
    			append_dev(ul0, li4);
    			append_dev(li4, strong4);
    			append_dev(li4, t20);
    			append_dev(ul0, t21);
    			append_dev(ul0, li5);
    			append_dev(li5, strong5);
    			append_dev(li5, t23);
    			append_dev(ul0, t24);
    			append_dev(ul0, li6);
    			append_dev(li6, strong6);
    			append_dev(li6, t26);
    			insert_dev(target, t27, anchor);
    			insert_dev(target, img1, anchor);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, h12, anchor);
    			insert_dev(target, t30, anchor);
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, ul1, anchor);
    			append_dev(ul1, li7);
    			append_dev(ul1, t34);
    			append_dev(ul1, li8);
    			append_dev(ul1, t36);
    			append_dev(ul1, li9);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, img2, anchor);
    			insert_dev(target, t39, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t41, anchor);
    			insert_dev(target, ul2, anchor);
    			append_dev(ul2, li10);
    			append_dev(ul2, t43);
    			append_dev(ul2, li11);
    			append_dev(ul2, t45);
    			append_dev(ul2, li12);
    			insert_dev(target, t47, anchor);
    			insert_dev(target, img3, anchor);
    			insert_dev(target, t48, anchor);
    			insert_dev(target, h32, anchor);
    			insert_dev(target, t50, anchor);
    			insert_dev(target, ul3, anchor);
    			append_dev(ul3, li13);
    			append_dev(ul3, t52);
    			append_dev(ul3, li14);
    			append_dev(ul3, t54);
    			append_dev(ul3, li15);
    			insert_dev(target, t56, anchor);
    			insert_dev(target, img4, anchor);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(img0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(ul0);
    			if (detaching) detach_dev(t27);
    			if (detaching) detach_dev(img1);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(h12);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(ul1);
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(img2);
    			if (detaching) detach_dev(t39);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t41);
    			if (detaching) detach_dev(ul2);
    			if (detaching) detach_dev(t47);
    			if (detaching) detach_dev(img3);
    			if (detaching) detach_dev(t48);
    			if (detaching) detach_dev(h32);
    			if (detaching) detach_dev(t50);
    			if (detaching) detach_dev(ul3);
    			if (detaching) detach_dev(t56);
    			if (detaching) detach_dev(img4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Training', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Training> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ base_url, axios: axios$1 });
    	return [];
    }

    class Training extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Training",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/pages/Application.svelte generated by Svelte v3.55.1 */
    const file$1 = "src/pages/Application.svelte";

    function create_fragment$1(ctx) {
    	let div9;
    	let div2;
    	let h20;
    	let button0;
    	let t1;
    	let div1;
    	let div0;
    	let t2;
    	let a0;
    	let t4;
    	let div5;
    	let h21;
    	let button1;
    	let t6;
    	let div4;
    	let div3;
    	let t7;
    	let a1;
    	let t9;
    	let div8;
    	let h22;
    	let button2;
    	let t11;
    	let div7;
    	let div6;
    	let h30;
    	let t13;
    	let ul0;
    	let li0;
    	let t15;
    	let li1;
    	let t17;
    	let li2;
    	let t19;
    	let p0;
    	let t20;
    	let table;
    	let thead;
    	let tr0;
    	let th0;
    	let t22;
    	let th1;
    	let t24;
    	let th2;
    	let t26;
    	let th3;
    	let t28;
    	let th4;
    	let t30;
    	let th5;
    	let t32;
    	let th6;
    	let t34;
    	let tbody;
    	let tr1;
    	let td0;
    	let t36;
    	let td1;
    	let t38;
    	let td2;
    	let t40;
    	let td3;
    	let t42;
    	let td4;
    	let t44;
    	let td5;
    	let t46;
    	let td6;
    	let t48;
    	let tr2;
    	let td7;
    	let t50;
    	let td8;
    	let t52;
    	let td9;
    	let t54;
    	let td10;
    	let t56;
    	let td11;
    	let t58;
    	let td12;
    	let t60;
    	let td13;
    	let t62;
    	let tr3;
    	let td14;
    	let t64;
    	let td15;
    	let t66;
    	let td16;
    	let t68;
    	let td17;
    	let t70;
    	let td18;
    	let t72;
    	let td19;
    	let t74;
    	let td20;
    	let t76;
    	let tr4;
    	let td21;
    	let t78;
    	let td22;
    	let t80;
    	let td23;
    	let t82;
    	let td24;
    	let t84;
    	let td25;
    	let t86;
    	let td26;
    	let t88;
    	let td27;
    	let t90;
    	let tr5;
    	let td28;
    	let t92;
    	let td29;
    	let t94;
    	let td30;
    	let t96;
    	let td31;
    	let t98;
    	let td32;
    	let t100;
    	let td33;
    	let t102;
    	let td34;
    	let t104;
    	let tr6;
    	let td35;
    	let t106;
    	let td36;
    	let t107;
    	let td37;
    	let t109;
    	let td38;
    	let t111;
    	let td39;
    	let t113;
    	let td40;
    	let t115;
    	let td41;
    	let t117;
    	let p1;
    	let t118;
    	let h31;
    	let t120;
    	let ul1;
    	let li3;
    	let p2;
    	let t122;
    	let p3;
    	let t124;
    	let li4;
    	let p4;
    	let t126;
    	let p5;
    	let t128;
    	let li5;
    	let p6;
    	let t130;
    	let p7;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div2 = element("div");
    			h20 = element("h2");
    			button0 = element("button");
    			button0.textContent = "Frontend and Backend";
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			t2 = text("The code is accessible on the GitHub from ZHAW: ");
    			a0 = element("a");
    			a0.textContent = "https://github.zhaw.ch/kollesal/ki-anwendung";
    			t4 = space();
    			div5 = element("div");
    			h21 = element("h2");
    			button1 = element("button");
    			button1.textContent = "Demo";
    			t6 = space();
    			div4 = element("div");
    			div3 = element("div");
    			t7 = text("The Application is available on the following site: ");
    			a1 = element("a");
    			a1.textContent = "ovulation.netlify.com";
    			t9 = space();
    			div8 = element("div");
    			h22 = element("h2");
    			button2 = element("button");
    			button2.textContent = "Results and user validation";
    			t11 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Goals and Questions";
    			t13 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Are there usability problems and where are they?";
    			t15 = space();
    			li1 = element("li");
    			li1.textContent = "Are there functions that are not understood by the\n                    users?";
    			t17 = space();
    			li2 = element("li");
    			li2.textContent = "Is the application useful?";
    			t19 = text("\n\n            To test the goals, the test persons could give a rating between\n            1- 5 points (1 point = poor, 5 points = very good) in the\n            following categories:\n            ");
    			p0 = element("p");
    			t20 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th0 = element("th");
    			th0.textContent = "Test Users";
    			t22 = space();
    			th1 = element("th");
    			th1.textContent = "Age";
    			t24 = space();
    			th2 = element("th");
    			th2.textContent = "Reliability";
    			t26 = space();
    			th3 = element("th");
    			th3.textContent = "Usability";
    			t28 = space();
    			th4 = element("th");
    			th4.textContent = "Usefulness";
    			t30 = space();
    			th5 = element("th");
    			th5.textContent = "Performance";
    			t32 = space();
    			th6 = element("th");
    			th6.textContent = "Appealing design";
    			t34 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Anja";
    			t36 = space();
    			td1 = element("td");
    			td1.textContent = "25";
    			t38 = space();
    			td2 = element("td");
    			td2.textContent = "3";
    			t40 = space();
    			td3 = element("td");
    			td3.textContent = "4";
    			t42 = space();
    			td4 = element("td");
    			td4.textContent = "2";
    			t44 = space();
    			td5 = element("td");
    			td5.textContent = "2";
    			t46 = space();
    			td6 = element("td");
    			td6.textContent = "4";
    			t48 = space();
    			tr2 = element("tr");
    			td7 = element("td");
    			td7.textContent = "Wynona";
    			t50 = space();
    			td8 = element("td");
    			td8.textContent = "28";
    			t52 = space();
    			td9 = element("td");
    			td9.textContent = "3";
    			t54 = space();
    			td10 = element("td");
    			td10.textContent = "3";
    			t56 = space();
    			td11 = element("td");
    			td11.textContent = "4";
    			t58 = space();
    			td12 = element("td");
    			td12.textContent = "3";
    			t60 = space();
    			td13 = element("td");
    			td13.textContent = "4";
    			t62 = space();
    			tr3 = element("tr");
    			td14 = element("td");
    			td14.textContent = "Sophie";
    			t64 = space();
    			td15 = element("td");
    			td15.textContent = "38";
    			t66 = space();
    			td16 = element("td");
    			td16.textContent = "2";
    			t68 = space();
    			td17 = element("td");
    			td17.textContent = "2";
    			t70 = space();
    			td18 = element("td");
    			td18.textContent = "3";
    			t72 = space();
    			td19 = element("td");
    			td19.textContent = "4";
    			t74 = space();
    			td20 = element("td");
    			td20.textContent = "5";
    			t76 = space();
    			tr4 = element("tr");
    			td21 = element("td");
    			td21.textContent = "Alexandra";
    			t78 = space();
    			td22 = element("td");
    			td22.textContent = "24";
    			t80 = space();
    			td23 = element("td");
    			td23.textContent = "4";
    			t82 = space();
    			td24 = element("td");
    			td24.textContent = "4";
    			t84 = space();
    			td25 = element("td");
    			td25.textContent = "3";
    			t86 = space();
    			td26 = element("td");
    			td26.textContent = "2";
    			t88 = space();
    			td27 = element("td");
    			td27.textContent = "3";
    			t90 = space();
    			tr5 = element("tr");
    			td28 = element("td");
    			td28.textContent = "Marie";
    			t92 = space();
    			td29 = element("td");
    			td29.textContent = "29";
    			t94 = space();
    			td30 = element("td");
    			td30.textContent = "3";
    			t96 = space();
    			td31 = element("td");
    			td31.textContent = "4";
    			t98 = space();
    			td32 = element("td");
    			td32.textContent = "3";
    			t100 = space();
    			td33 = element("td");
    			td33.textContent = "2";
    			t102 = space();
    			td34 = element("td");
    			td34.textContent = "4";
    			t104 = space();
    			tr6 = element("tr");
    			td35 = element("td");
    			td35.textContent = "Total";
    			t106 = space();
    			td36 = element("td");
    			t107 = space();
    			td37 = element("td");
    			td37.textContent = "3.6";
    			t109 = space();
    			td38 = element("td");
    			td38.textContent = "3.4";
    			t111 = space();
    			td39 = element("td");
    			td39.textContent = "3";
    			t113 = space();
    			td40 = element("td");
    			td40.textContent = "2.6";
    			t115 = space();
    			td41 = element("td");
    			td41.textContent = "4";
    			t117 = space();
    			p1 = element("p");
    			t118 = space();
    			h31 = element("h3");
    			h31.textContent = "Anwering the Questions";
    			t120 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			p2 = element("p");
    			p2.textContent = "Are there usability problems and where are they?";
    			t122 = space();
    			p3 = element("p");
    			p3.textContent = "Yes, there are usability problems. For example,\n                        there could be help to which fields are required to\n                        be filled out.";
    			t124 = space();
    			li4 = element("li");
    			p4 = element("p");
    			p4.textContent = "Are there functions that are not understood by the\n                        users?";
    			t126 = space();
    			p5 = element("p");
    			p5.textContent = "Yes, mostly the function was understood for the\n                        experienced users. For inexperienced persons there\n                        should be more information and help sites.";
    			t128 = space();
    			li5 = element("li");
    			p6 = element("p");
    			p6.textContent = "Is the application useful?";
    			t130 = space();
    			p7 = element("p");
    			p7.textContent = "Mostly not. It gives an average to when the\n                        ovulation is expected. There could be additional\n                        features, where a person could type in the last day\n                        of the menses and the application will calulate on\n                        which calendar date the ovulation will be most\n                        likely. In this way, the user doesn't has to\n                        calculate with Cycle days and can use the Calendar\n                        days.";
    			attr_dev(button0, "class", "accordion-button svelte-9yp6mu");
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "data-bs-toggle", "collapse");
    			attr_dev(button0, "data-bs-target", "#panelsStayOpen-collapseOne");
    			attr_dev(button0, "aria-expanded", "true");
    			attr_dev(button0, "aria-controls", "panelsStayOpen-collapseOne");
    			add_location(button0, file$1, 8, 8, 260);
    			attr_dev(h20, "class", "accordion-header");
    			attr_dev(h20, "id", "panelsStayOpen-headingOne");
    			add_location(h20, file$1, 7, 6, 191);
    			attr_dev(a0, "href", "https://github.zhaw.ch/kollesal/ki-anwendung");
    			attr_dev(a0, "class", "svelte-9yp6mu");
    			add_location(a0, file$1, 14, 60, 732);
    			attr_dev(div0, "class", "accordion-body svelte-9yp6mu");
    			add_location(div0, file$1, 13, 8, 643);
    			attr_dev(div1, "id", "panelsStayOpen-collapseOne");
    			attr_dev(div1, "class", "accordion-collapse collapse show");
    			attr_dev(div1, "aria-labelledby", "panelsStayOpen-headingOne");
    			add_location(div1, file$1, 12, 6, 512);
    			attr_dev(div2, "class", "accordion-item");
    			add_location(div2, file$1, 6, 4, 156);
    			attr_dev(button1, "class", "accordion-button collapsed svelte-9yp6mu");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-bs-toggle", "collapse");
    			attr_dev(button1, "data-bs-target", "#panelsStayOpen-collapseTwo");
    			attr_dev(button1, "aria-expanded", "false");
    			attr_dev(button1, "aria-controls", "panelsStayOpen-collapseTwo");
    			add_location(button1, file$1, 23, 8, 1017);
    			attr_dev(h21, "class", "accordion-header");
    			attr_dev(h21, "id", "panelsStayOpen-headingTwo");
    			add_location(h21, file$1, 22, 6, 948);
    			attr_dev(a1, "href", "ovulation.netlify.com");
    			attr_dev(a1, "class", "svelte-9yp6mu");
    			add_location(a1, file$1, 29, 64, 1483);
    			attr_dev(div3, "class", "accordion-body svelte-9yp6mu");
    			add_location(div3, file$1, 28, 8, 1390);
    			attr_dev(div4, "id", "panelsStayOpen-collapseTwo");
    			attr_dev(div4, "class", "accordion-collapse collapse");
    			attr_dev(div4, "aria-labelledby", "panelsStayOpen-headingTwo");
    			add_location(div4, file$1, 27, 6, 1264);
    			attr_dev(div5, "class", "accordion-item");
    			add_location(div5, file$1, 21, 4, 913);
    			attr_dev(button2, "class", "accordion-button collapsed svelte-9yp6mu");
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bs-toggle", "collapse");
    			attr_dev(button2, "data-bs-target", "#panelsStayOpen-collapseThree");
    			attr_dev(button2, "aria-expanded", "false");
    			attr_dev(button2, "aria-controls", "panelsStayOpen-collapseThree");
    			add_location(button2, file$1, 37, 8, 1711);
    			attr_dev(h22, "class", "accordion-header");
    			attr_dev(h22, "id", "panelsStayOpen-headingThree");
    			add_location(h22, file$1, 36, 6, 1640);
    			add_location(h30, file$1, 43, 12, 2156);
    			add_location(li0, file$1, 46, 16, 2219);
    			add_location(li1, file$1, 47, 16, 2293);
    			add_location(li2, file$1, 51, 16, 2434);
    			add_location(ul0, file$1, 45, 12, 2198);
    			add_location(p0, file$1, 57, 12, 2681);
    			attr_dev(th0, "class", "svelte-9yp6mu");
    			add_location(th0, file$1, 62, 24, 2781);
    			attr_dev(th1, "class", "svelte-9yp6mu");
    			add_location(th1, file$1, 63, 24, 2825);
    			attr_dev(th2, "class", "svelte-9yp6mu");
    			add_location(th2, file$1, 64, 24, 2862);
    			attr_dev(th3, "class", "svelte-9yp6mu");
    			add_location(th3, file$1, 65, 24, 2907);
    			attr_dev(th4, "class", "svelte-9yp6mu");
    			add_location(th4, file$1, 66, 24, 2950);
    			attr_dev(th5, "class", "svelte-9yp6mu");
    			add_location(th5, file$1, 67, 24, 2994);
    			attr_dev(th6, "class", "svelte-9yp6mu");
    			add_location(th6, file$1, 68, 24, 3039);
    			add_location(tr0, file$1, 61, 20, 2752);
    			add_location(thead, file$1, 60, 16, 2724);
    			attr_dev(td0, "class", "svelte-9yp6mu");
    			add_location(td0, file$1, 73, 24, 3189);
    			attr_dev(td1, "class", "svelte-9yp6mu");
    			add_location(td1, file$1, 74, 24, 3227);
    			attr_dev(td2, "class", "svelte-9yp6mu");
    			add_location(td2, file$1, 75, 24, 3263);
    			attr_dev(td3, "class", "svelte-9yp6mu");
    			add_location(td3, file$1, 76, 24, 3298);
    			attr_dev(td4, "class", "svelte-9yp6mu");
    			add_location(td4, file$1, 77, 24, 3333);
    			attr_dev(td5, "class", "svelte-9yp6mu");
    			add_location(td5, file$1, 78, 24, 3368);
    			attr_dev(td6, "class", "svelte-9yp6mu");
    			add_location(td6, file$1, 79, 24, 3403);
    			attr_dev(tr1, "class", "svelte-9yp6mu");
    			add_location(tr1, file$1, 72, 20, 3160);
    			attr_dev(td7, "class", "svelte-9yp6mu");
    			add_location(td7, file$1, 82, 24, 3489);
    			attr_dev(td8, "class", "svelte-9yp6mu");
    			add_location(td8, file$1, 83, 24, 3529);
    			attr_dev(td9, "class", "svelte-9yp6mu");
    			add_location(td9, file$1, 84, 24, 3565);
    			attr_dev(td10, "class", "svelte-9yp6mu");
    			add_location(td10, file$1, 85, 24, 3600);
    			attr_dev(td11, "class", "svelte-9yp6mu");
    			add_location(td11, file$1, 86, 24, 3635);
    			attr_dev(td12, "class", "svelte-9yp6mu");
    			add_location(td12, file$1, 87, 24, 3670);
    			attr_dev(td13, "class", "svelte-9yp6mu");
    			add_location(td13, file$1, 88, 24, 3705);
    			attr_dev(tr2, "class", "svelte-9yp6mu");
    			add_location(tr2, file$1, 81, 20, 3460);
    			attr_dev(td14, "class", "svelte-9yp6mu");
    			add_location(td14, file$1, 91, 24, 3791);
    			attr_dev(td15, "class", "svelte-9yp6mu");
    			add_location(td15, file$1, 92, 24, 3831);
    			attr_dev(td16, "class", "svelte-9yp6mu");
    			add_location(td16, file$1, 93, 24, 3867);
    			attr_dev(td17, "class", "svelte-9yp6mu");
    			add_location(td17, file$1, 94, 24, 3902);
    			attr_dev(td18, "class", "svelte-9yp6mu");
    			add_location(td18, file$1, 95, 24, 3937);
    			attr_dev(td19, "class", "svelte-9yp6mu");
    			add_location(td19, file$1, 96, 24, 3972);
    			attr_dev(td20, "class", "svelte-9yp6mu");
    			add_location(td20, file$1, 97, 24, 4007);
    			attr_dev(tr3, "class", "svelte-9yp6mu");
    			add_location(tr3, file$1, 90, 20, 3762);
    			attr_dev(td21, "class", "svelte-9yp6mu");
    			add_location(td21, file$1, 100, 24, 4093);
    			attr_dev(td22, "class", "svelte-9yp6mu");
    			add_location(td22, file$1, 101, 24, 4136);
    			attr_dev(td23, "class", "svelte-9yp6mu");
    			add_location(td23, file$1, 102, 24, 4172);
    			attr_dev(td24, "class", "svelte-9yp6mu");
    			add_location(td24, file$1, 103, 24, 4207);
    			attr_dev(td25, "class", "svelte-9yp6mu");
    			add_location(td25, file$1, 104, 24, 4242);
    			attr_dev(td26, "class", "svelte-9yp6mu");
    			add_location(td26, file$1, 105, 24, 4277);
    			attr_dev(td27, "class", "svelte-9yp6mu");
    			add_location(td27, file$1, 106, 24, 4312);
    			attr_dev(tr4, "class", "svelte-9yp6mu");
    			add_location(tr4, file$1, 99, 20, 4064);
    			attr_dev(td28, "class", "svelte-9yp6mu");
    			add_location(td28, file$1, 109, 24, 4398);
    			attr_dev(td29, "class", "svelte-9yp6mu");
    			add_location(td29, file$1, 110, 24, 4437);
    			attr_dev(td30, "class", "svelte-9yp6mu");
    			add_location(td30, file$1, 111, 24, 4473);
    			attr_dev(td31, "class", "svelte-9yp6mu");
    			add_location(td31, file$1, 112, 24, 4508);
    			attr_dev(td32, "class", "svelte-9yp6mu");
    			add_location(td32, file$1, 113, 24, 4543);
    			attr_dev(td33, "class", "svelte-9yp6mu");
    			add_location(td33, file$1, 114, 24, 4578);
    			attr_dev(td34, "class", "svelte-9yp6mu");
    			add_location(td34, file$1, 115, 24, 4613);
    			attr_dev(tr5, "class", "svelte-9yp6mu");
    			add_location(tr5, file$1, 108, 20, 4369);
    			attr_dev(td35, "class", "svelte-9yp6mu");
    			add_location(td35, file$1, 118, 24, 4699);
    			attr_dev(td36, "class", "svelte-9yp6mu");
    			add_location(td36, file$1, 119, 24, 4738);
    			attr_dev(td37, "class", "svelte-9yp6mu");
    			add_location(td37, file$1, 120, 24, 4769);
    			attr_dev(td38, "class", "svelte-9yp6mu");
    			add_location(td38, file$1, 121, 24, 4806);
    			attr_dev(td39, "class", "svelte-9yp6mu");
    			add_location(td39, file$1, 122, 24, 4843);
    			attr_dev(td40, "class", "svelte-9yp6mu");
    			add_location(td40, file$1, 123, 24, 4878);
    			attr_dev(td41, "class", "svelte-9yp6mu");
    			add_location(td41, file$1, 124, 24, 4915);
    			attr_dev(tr6, "class", "svelte-9yp6mu");
    			add_location(tr6, file$1, 117, 20, 4670);
    			attr_dev(tbody, "class", "svelte-9yp6mu");
    			add_location(tbody, file$1, 71, 16, 3132);
    			attr_dev(table, "class", "svelte-9yp6mu");
    			add_location(table, file$1, 59, 12, 2700);
    			add_location(p1, file$1, 128, 12, 5010);
    			add_location(h31, file$1, 129, 12, 5028);
    			add_location(p2, file$1, 133, 20, 5119);
    			add_location(p3, file$1, 134, 20, 5195);
    			add_location(li3, file$1, 132, 16, 5094);
    			add_location(p4, file$1, 141, 20, 5474);
    			add_location(p5, file$1, 145, 20, 5629);
    			add_location(li4, file$1, 140, 16, 5449);
    			add_location(p6, file$1, 152, 20, 5935);
    			add_location(p7, file$1, 153, 20, 5989);
    			add_location(li5, file$1, 151, 16, 5910);
    			add_location(ul1, file$1, 131, 12, 5073);
    			attr_dev(div6, "class", "accordion-body svelte-9yp6mu");
    			add_location(div6, file$1, 42, 8, 2115);
    			attr_dev(div7, "id", "panelsStayOpen-collapseThree");
    			attr_dev(div7, "class", "accordion-collapse collapse");
    			attr_dev(div7, "aria-labelledby", "panelsStayOpen-headingThree");
    			add_location(div7, file$1, 41, 6, 1985);
    			attr_dev(div8, "class", "accordion-item");
    			add_location(div8, file$1, 35, 4, 1605);
    			attr_dev(div9, "class", "accordion");
    			attr_dev(div9, "id", "accordionPanelsStayOpenExample");
    			add_location(div9, file$1, 5, 0, 92);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div2);
    			append_dev(div2, h20);
    			append_dev(h20, button0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, t2);
    			append_dev(div0, a0);
    			append_dev(div9, t4);
    			append_dev(div9, div5);
    			append_dev(div5, h21);
    			append_dev(h21, button1);
    			append_dev(div5, t6);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t7);
    			append_dev(div3, a1);
    			append_dev(div9, t9);
    			append_dev(div9, div8);
    			append_dev(div8, h22);
    			append_dev(h22, button2);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h30);
    			append_dev(div6, t13);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t15);
    			append_dev(ul0, li1);
    			append_dev(ul0, t17);
    			append_dev(ul0, li2);
    			append_dev(div6, t19);
    			append_dev(div6, p0);
    			append_dev(div6, t20);
    			append_dev(div6, table);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th0);
    			append_dev(tr0, t22);
    			append_dev(tr0, th1);
    			append_dev(tr0, t24);
    			append_dev(tr0, th2);
    			append_dev(tr0, t26);
    			append_dev(tr0, th3);
    			append_dev(tr0, t28);
    			append_dev(tr0, th4);
    			append_dev(tr0, t30);
    			append_dev(tr0, th5);
    			append_dev(tr0, t32);
    			append_dev(tr0, th6);
    			append_dev(table, t34);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(tr1, t36);
    			append_dev(tr1, td1);
    			append_dev(tr1, t38);
    			append_dev(tr1, td2);
    			append_dev(tr1, t40);
    			append_dev(tr1, td3);
    			append_dev(tr1, t42);
    			append_dev(tr1, td4);
    			append_dev(tr1, t44);
    			append_dev(tr1, td5);
    			append_dev(tr1, t46);
    			append_dev(tr1, td6);
    			append_dev(tbody, t48);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td7);
    			append_dev(tr2, t50);
    			append_dev(tr2, td8);
    			append_dev(tr2, t52);
    			append_dev(tr2, td9);
    			append_dev(tr2, t54);
    			append_dev(tr2, td10);
    			append_dev(tr2, t56);
    			append_dev(tr2, td11);
    			append_dev(tr2, t58);
    			append_dev(tr2, td12);
    			append_dev(tr2, t60);
    			append_dev(tr2, td13);
    			append_dev(tbody, t62);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td14);
    			append_dev(tr3, t64);
    			append_dev(tr3, td15);
    			append_dev(tr3, t66);
    			append_dev(tr3, td16);
    			append_dev(tr3, t68);
    			append_dev(tr3, td17);
    			append_dev(tr3, t70);
    			append_dev(tr3, td18);
    			append_dev(tr3, t72);
    			append_dev(tr3, td19);
    			append_dev(tr3, t74);
    			append_dev(tr3, td20);
    			append_dev(tbody, t76);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td21);
    			append_dev(tr4, t78);
    			append_dev(tr4, td22);
    			append_dev(tr4, t80);
    			append_dev(tr4, td23);
    			append_dev(tr4, t82);
    			append_dev(tr4, td24);
    			append_dev(tr4, t84);
    			append_dev(tr4, td25);
    			append_dev(tr4, t86);
    			append_dev(tr4, td26);
    			append_dev(tr4, t88);
    			append_dev(tr4, td27);
    			append_dev(tbody, t90);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td28);
    			append_dev(tr5, t92);
    			append_dev(tr5, td29);
    			append_dev(tr5, t94);
    			append_dev(tr5, td30);
    			append_dev(tr5, t96);
    			append_dev(tr5, td31);
    			append_dev(tr5, t98);
    			append_dev(tr5, td32);
    			append_dev(tr5, t100);
    			append_dev(tr5, td33);
    			append_dev(tr5, t102);
    			append_dev(tr5, td34);
    			append_dev(tbody, t104);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td35);
    			append_dev(tr6, t106);
    			append_dev(tr6, td36);
    			append_dev(tr6, t107);
    			append_dev(tr6, td37);
    			append_dev(tr6, t109);
    			append_dev(tr6, td38);
    			append_dev(tr6, t111);
    			append_dev(tr6, td39);
    			append_dev(tr6, t113);
    			append_dev(tr6, td40);
    			append_dev(tr6, t115);
    			append_dev(tr6, td41);
    			append_dev(div6, t117);
    			append_dev(div6, p1);
    			append_dev(div6, t118);
    			append_dev(div6, h31);
    			append_dev(div6, t120);
    			append_dev(div6, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, p2);
    			append_dev(li3, t122);
    			append_dev(li3, p3);
    			append_dev(ul1, t124);
    			append_dev(ul1, li4);
    			append_dev(li4, p4);
    			append_dev(li4, t126);
    			append_dev(li4, p5);
    			append_dev(ul1, t128);
    			append_dev(ul1, li5);
    			append_dev(li5, p6);
    			append_dev(li5, t130);
    			append_dev(li5, p7);
    		},
    		p: noop$1,
    		i: noop$1,
    		o: noop$1,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Application', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Application> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ base_url, axios: axios$1 });
    	return [];
    }

    class Application extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Application",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    // Pages


    var routes = {
        // Home
        '/': Mens,
        '/mens': Mens,
        '/data': Data,
        '/motivation': Motivation,
        '/training': Training,
        '/application': Application,


    };

    /* src/App.svelte generated by Svelte v3.55.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let nav;
    	let a0;
    	let t1;
    	let button;
    	let span;
    	let t2;
    	let div0;
    	let ul;
    	let li0;
    	let a1;
    	let t4;
    	let li1;
    	let a2;
    	let t6;
    	let li2;
    	let a3;
    	let t8;
    	let li3;
    	let a4;
    	let t10;
    	let li4;
    	let a5;
    	let t12;
    	let div1;
    	let router;
    	let current;
    	router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			t2 = space();
    			div0 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "Ovulation Regression";
    			t4 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "Motivation";
    			t6 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "Data Collection and preparation";
    			t8 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "Model Training";
    			t10 = space();
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "Model Application";
    			t12 = space();
    			div1 = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(a0, "class", "navbar-brand svelte-bkqe4t");
    			attr_dev(a0, "href", "#/");
    			add_location(a0, file, 9, 1, 241);
    			attr_dev(span, "class", "navbar-toggler-icon svelte-bkqe4t");
    			add_location(span, file, 11, 3, 461);
    			attr_dev(button, "class", "navbar-toggler svelte-bkqe4t");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-toggle", "collapse");
    			attr_dev(button, "data-target", "#navbarNav");
    			attr_dev(button, "aria-controls", "navbarNav");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file, 10, 1, 285);
    			attr_dev(a1, "class", "nav-link svelte-bkqe4t");
    			attr_dev(a1, "href", "#/mens");
    			add_location(a1, file, 17, 4, 625);
    			attr_dev(li0, "class", "nav-item svelte-bkqe4t");
    			add_location(li0, file, 16, 2, 599);
    			attr_dev(a2, "class", "nav-link svelte-bkqe4t");
    			attr_dev(a2, "href", "#/motivation");
    			add_location(a2, file, 20, 3, 719);
    			attr_dev(li1, "class", "nav-item svelte-bkqe4t");
    			add_location(li1, file, 19, 2, 694);
    			attr_dev(a3, "class", "nav-link svelte-bkqe4t");
    			attr_dev(a3, "href", "#/data");
    			add_location(a3, file, 24, 4, 813);
    			attr_dev(li2, "class", "nav-item svelte-bkqe4t");
    			add_location(li2, file, 23, 2, 787);
    			attr_dev(a4, "class", "nav-link svelte-bkqe4t");
    			attr_dev(a4, "href", "#/training");
    			add_location(a4, file, 27, 3, 918);
    			attr_dev(li3, "class", "nav-item svelte-bkqe4t");
    			add_location(li3, file, 26, 2, 893);
    			attr_dev(a5, "class", "nav-link svelte-bkqe4t");
    			attr_dev(a5, "href", "#/application");
    			add_location(a5, file, 30, 3, 1014);
    			attr_dev(li4, "class", "nav-item svelte-bkqe4t");
    			add_location(li4, file, 29, 4, 989);
    			attr_dev(ul, "class", "navbar-nav svelte-bkqe4t");
    			add_location(ul, file, 14, 3, 572);
    			attr_dev(div0, "class", "collapse navbar-collapse svelte-bkqe4t");
    			attr_dev(div0, "id", "navbarNav");
    			add_location(div0, file, 13, 1, 515);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light bg-light svelte-bkqe4t");
    			add_location(nav, file, 7, 0, 133);
    			attr_dev(div1, "class", "container mt-3");
    			add_location(div1, file, 37, 0, 1115);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, a0);
    			append_dev(nav, t1);
    			append_dev(nav, button);
    			append_dev(button, span);
    			append_dev(nav, t2);
    			append_dev(nav, div0);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a1);
    			append_dev(ul, t4);
    			append_dev(ul, li1);
    			append_dev(li1, a2);
    			append_dev(ul, t6);
    			append_dev(ul, li2);
    			append_dev(li2, a3);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, a4);
    			append_dev(ul, t10);
    			append_dev(ul, li4);
    			append_dev(li4, a5);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div1, anchor);
    			mount_component(router, div1, null);
    			current = true;
    		},
    		p: noop$1,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div1);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router, routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
