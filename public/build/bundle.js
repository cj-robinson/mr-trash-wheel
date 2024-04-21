
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
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
            flush_render_callbacks($$.after_update);
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
            update: noop,
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
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
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

    /* src/boat.svelte generated by Svelte v3.59.2 */
    const file$2 = "src/boat.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i].id;
    	child_ctx[17] = list[i].offset;
    	child_ctx[18] = list[i].horizontal;
    	child_ctx[19] = list[i].imageSrc;
    	child_ctx[20] = list[i].type;
    	child_ctx[21] = list[i].transition;
    	return child_ctx;
    }

    // (165:27) 
    function create_if_block_6(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "black");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 165, 3, 5554);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(165:27) ",
    		ctx
    	});

    	return block;
    }

    // (163:35) 
    function create_if_block_5(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "orange");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 163, 3, 5362);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(163:35) ",
    		ctx
    	});

    	return block;
    }

    // (161:32) 
    function create_if_block_4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "yellow");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 161, 3, 5162);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(161:32) ",
    		ctx
    	});

    	return block;
    }

    // (159:32) 
    function create_if_block_3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "purple");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 159, 3, 4965);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(159:32) ",
    		ctx
    	});

    	return block;
    }

    // (157:35) 
    function create_if_block_2(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "green");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 157, 3, 4769);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(157:35) ",
    		ctx
    	});

    	return block;
    }

    // (155:2) {#if type === 'waterbottle'}
    function create_if_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "shape svelte-1pbhu9t");
    			set_style(div, "position", "absolute");
    			set_style(div, "background-color", "blue");
    			set_style(div, "top", /*offset*/ ctx[17] + "px");
    			set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			set_style(div, "transition", /*transition*/ ctx[21]);
    			set_style(div, "z-index", /*zIndex*/ ctx[4]);
    			add_location(div, file$2, 155, 3, 4572);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*objects*/ 1) {
    				set_style(div, "top", /*offset*/ ctx[17] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "left", /*horizontal*/ ctx[18] + "px");
    			}

    			if (dirty & /*objects*/ 1) {
    				set_style(div, "transition", /*transition*/ ctx[21]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(155:2) {#if type === 'waterbottle'}",
    		ctx
    	});

    	return block;
    }

    // (154:1) {#each objects as { id, offset, horizontal, imageSrc, type, transition}}
    function create_each_block$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[20] === 'waterbottle') return create_if_block_1;
    		if (/*type*/ ctx[20] === 'plasticbags') return create_if_block_2;
    		if (/*type*/ ctx[20] === 'plastics') return create_if_block_3;
    		if (/*type*/ ctx[20] === 'wrappers') return create_if_block_4;
    		if (/*type*/ ctx[20] === 'sportsballs') return create_if_block_5;
    		if (/*type*/ ctx[20] === 'cig') return create_if_block_6;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(154:1) {#each objects as { id, offset, horizontal, imageSrc, type, transition}}",
    		ctx
    	});

    	return block;
    }

    // (172:1) {#if window.scrollY >= minInitialOffset && window.scrollY <= maxInitialOffset}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Current Hour: ");
    			t1 = text(/*currentHour*/ ctx[3]);
    			t2 = text(":00");
    			attr_dev(div, "class", "hour-counter svelte-1pbhu9t");
    			set_style(div, "top", "20%");
    			set_style(div, "z-index", "10");
    			set_style(div, "right", "10%");
    			add_location(div, file$2, 172, 2, 5858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentHour*/ 8) set_data_dev(t1, /*currentHour*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(172:1) {#if window.scrollY >= minInitialOffset && window.scrollY <= maxInitialOffset}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let each_value = /*objects*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	let if_block = window.scrollY >= /*minInitialOffset*/ ctx[1] && window.scrollY <= /*maxInitialOffset*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t1 = space();
    			div2 = element("div");
    			attr_dev(div0, "class", "center-square svelte-1pbhu9t");
    			add_location(div0, file$2, 152, 0, 4436);
    			attr_dev(div1, "class", "hour-counter-container svelte-1pbhu9t");
    			add_location(div1, file$2, 170, 0, 5739);
    			set_style(div2, "height", "30000px");
    			add_location(div2, file$2, 177, 0, 5985);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*objects, zIndex*/ 17) {
    				each_value = /*objects*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (window.scrollY >= /*minInitialOffset*/ ctx[1] && window.scrollY <= /*maxInitialOffset*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
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
    	validate_slots('Boat', slots, []);
    	let objects = [];
    	let windowHeight = 0;
    	let windowWidth = 0;
    	let initialScrollY = 0;
    	let minInitialOffset = Number.MAX_VALUE;
    	let maxInitialOffset = Number.MIN_VALUE;
    	let currentHour = 0;
    	let squareBounds = { top: 0, bottom: 0 };
    	let zIndex = 0;

    	const objectConfigs = [
    		{
    			type: 'waterbottle',
    			number: 1981,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'cig',
    			number: 18656,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'plasticbags',
    			number: 867,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'plastics',
    			number: 1462,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'glassbottles',
    			number: 21,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'wrappers',
    			number: 1427,
    			imageSrc: 'water_bottle.svg'
    		},
    		{
    			type: 'sportsballs',
    			number: 867,
    			imageSrc: 'water_bottle.svg'
    		}
    	];

    	let columns = 200; // This can be adjusted based on the screen width or desired grid density
    	let cellWidth = 10;
    	let cellHeight = 10;

    	onMount(() => {
    		windowHeight = window.innerHeight;
    		windowWidth = window.innerWidth;
    		initialScrollY = window.scrollY;
    		initObjects();
    		calculateGridPositions();
    		window.addEventListener('scroll', handleScroll);

    		return () => {
    			window.removeEventListener('scroll', handleScroll);
    		};
    	});

    	function calculateGridPositions() {
    		let yStart = windowHeight - 600; // Starting below the viewport height
    		let xStart = 0;

    		objectConfigs.forEach(config => {
    			let index = 0;

    			objects.filter(obj => obj.type === config.type).forEach(obj => {
    				let row = Math.floor(index / columns);
    				let col = index % columns;
    				obj.finalX = xStart + col * cellWidth;
    				obj.finalY = yStart + row * cellHeight;
    				index++;
    			});

    			yStart += (Math.ceil(config.number / columns) + 1) * cellHeight; // Move to next block
    		});
    	}

    	function initObjects() {
    		$$invalidate(1, minInitialOffset = windowHeight * 22);
    		$$invalidate(2, maxInitialOffset = windowHeight * 40);

    		$$invalidate(0, objects = objectConfigs.flatMap(config => {
    			return Array.from({ length: config.number }, (_, i) => {
    				let earlyAppearanceOffset = 0;

    				if (i < 1 & config.type === 'waterbottle') {
    					// Assuming you want the first two objects of each type to appear earlier
    					earlyAppearanceOffset = windowHeight * 12; // Smaller offset for earlier appearance
    				} else if (i < 1 & config.type === 'cig') {
    					earlyAppearanceOffset = windowHeight * 14.5; // Smaller offset for earlier appearance
    				} else if (i < 1 & (config.type === 'wrappers' | config.type === 'plastics' | config.type === 'glassbottles' | config.type === 'sportsballs' | config.type === 'plasticbags')) {
    					earlyAppearanceOffset = windowHeight * 17.7; // Smaller offset for earlier appearance
    				} else {
    					earlyAppearanceOffset = minInitialOffset + Math.random() * (maxInitialOffset - minInitialOffset);
    				}

    				const originalHorizontal = Math.random() * 100;

    				return {
    					id: `${config.type}-${i}`,
    					type: config.type,
    					imageSrc: config.imageSrc,
    					initialOffset: earlyAppearanceOffset,
    					horizontal: originalHorizontal,
    					originalHorizontal
    				};
    			});
    		}));
    	}

    	function handleScroll() {
    		const scrollY = window.scrollY;
    		$$invalidate(3, currentHour = Math.floor((scrollY - minInitialOffset) / (maxInitialOffset - minInitialOffset) * 24) % 24);

    		if (scrollY >= maxInitialOffset) {
    			// Move shapes to their final grid positions
    			$$invalidate(0, objects = objects.map(obj => ({
    				...obj,
    				horizontal: obj.finalX,
    				offset: obj.finalY,
    				transition: "left 5s, top 5s"
    			})));
    		} else {
    			// Normal scroll behavior
    			$$invalidate(0, objects = objects.map(obj => {
    				let newOffset = obj.initialOffset - scrollY;

    				return {
    					...obj,
    					horizontal: obj.originalHorizontal,
    					offset: newOffset <= squareBounds.top
    					? squareBounds.top
    					: newOffset,
    					transition: "none",
    					zIndex: newOffset === squareBounds.top ? 1 : 1000, // Ensures it's behind when at the top
    					
    				};
    			}));
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Boat> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		objects,
    		windowHeight,
    		windowWidth,
    		initialScrollY,
    		minInitialOffset,
    		maxInitialOffset,
    		currentHour,
    		squareBounds,
    		zIndex,
    		objectConfigs,
    		columns,
    		cellWidth,
    		cellHeight,
    		calculateGridPositions,
    		initObjects,
    		handleScroll
    	});

    	$$self.$inject_state = $$props => {
    		if ('objects' in $$props) $$invalidate(0, objects = $$props.objects);
    		if ('windowHeight' in $$props) windowHeight = $$props.windowHeight;
    		if ('windowWidth' in $$props) windowWidth = $$props.windowWidth;
    		if ('initialScrollY' in $$props) initialScrollY = $$props.initialScrollY;
    		if ('minInitialOffset' in $$props) $$invalidate(1, minInitialOffset = $$props.minInitialOffset);
    		if ('maxInitialOffset' in $$props) $$invalidate(2, maxInitialOffset = $$props.maxInitialOffset);
    		if ('currentHour' in $$props) $$invalidate(3, currentHour = $$props.currentHour);
    		if ('squareBounds' in $$props) squareBounds = $$props.squareBounds;
    		if ('zIndex' in $$props) $$invalidate(4, zIndex = $$props.zIndex);
    		if ('columns' in $$props) columns = $$props.columns;
    		if ('cellWidth' in $$props) cellWidth = $$props.cellWidth;
    		if ('cellHeight' in $$props) cellHeight = $$props.cellHeight;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [objects, minInitialOffset, maxInitialOffset, currentHour, zIndex];
    }

    class Boat extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Boat",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Scrolly.svelte generated by Svelte v3.59.2 */
    const file$1 = "src/Scrolly.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			add_location(div, file$1, 81, 2, 2147);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			/*div_binding*/ ctx[8](div);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 64)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[6],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[6])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			/*div_binding*/ ctx[8](null);
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
    	validate_slots('Scrolly', slots, ['default']);
    	let { root = null } = $$props;
    	let { top = 0 } = $$props;
    	let { bottom = 0 } = $$props;
    	let { increments = 100 } = $$props;
    	let { value = undefined } = $$props;
    	const steps = [];
    	const threshold = [];
    	let nodes = [];
    	let intersectionObservers = [];
    	let container;

    	const update = () => {
    		if (!nodes.length) return;
    		nodes.forEach(createObserver);
    	};

    	const mostInView = () => {
    		let maxRatio = 0;
    		let maxIndex = 0;

    		for (let i = 0; i < steps.length; i++) {
    			if (steps[i] > maxRatio) {
    				maxRatio = steps[i];
    				maxIndex = i;
    			}
    		}

    		if (maxRatio > 0) $$invalidate(1, value = maxIndex); else $$invalidate(1, value = undefined);
    	};

    	const createObserver = (node, index) => {
    		const handleIntersect = e => {
    			e[0].isIntersecting;
    			const ratio = e[0].intersectionRatio;
    			steps[index] = ratio;
    			mostInView();
    		};

    		const marginTop = top ? top * -1 : 0;
    		const marginBottom = bottom ? bottom * -1 : 0;
    		const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
    		const options = { root, rootMargin, threshold };
    		if (intersectionObservers[index]) intersectionObservers[index].disconnect();
    		const io = new IntersectionObserver(handleIntersect, options);
    		io.observe(node);
    		intersectionObservers[index] = io;
    	};

    	onMount(() => {
    		for (let i = 0; i < increments + 1; i++) {
    			threshold.push(i / increments);
    		}

    		nodes = container.querySelectorAll(":scope > *");
    		update();
    	});

    	const writable_props = ['root', 'top', 'bottom', 'increments', 'value'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Scrolly> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			container = $$value;
    			$$invalidate(0, container);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('root' in $$props) $$invalidate(2, root = $$props.root);
    		if ('top' in $$props) $$invalidate(3, top = $$props.top);
    		if ('bottom' in $$props) $$invalidate(4, bottom = $$props.bottom);
    		if ('increments' in $$props) $$invalidate(5, increments = $$props.increments);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('$$scope' in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		root,
    		top,
    		bottom,
    		increments,
    		value,
    		steps,
    		threshold,
    		nodes,
    		intersectionObservers,
    		container,
    		update,
    		mostInView,
    		createObserver
    	});

    	$$self.$inject_state = $$props => {
    		if ('root' in $$props) $$invalidate(2, root = $$props.root);
    		if ('top' in $$props) $$invalidate(3, top = $$props.top);
    		if ('bottom' in $$props) $$invalidate(4, bottom = $$props.bottom);
    		if ('increments' in $$props) $$invalidate(5, increments = $$props.increments);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    		if ('nodes' in $$props) nodes = $$props.nodes;
    		if ('intersectionObservers' in $$props) intersectionObservers = $$props.intersectionObservers;
    		if ('container' in $$props) $$invalidate(0, container = $$props.container);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*top, bottom*/ 24) {
    			(update());
    		}
    	};

    	return [container, value, root, top, bottom, increments, $$scope, slots, div_binding];
    }

    class Scrolly extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			root: 2,
    			top: 3,
    			bottom: 4,
    			increments: 5,
    			value: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Scrolly",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get root() {
    		throw new Error("<Scrolly>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set root(value) {
    		throw new Error("<Scrolly>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get top() {
    		throw new Error("<Scrolly>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set top(value) {
    		throw new Error("<Scrolly>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bottom() {
    		throw new Error("<Scrolly>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bottom(value) {
    		throw new Error("<Scrolly>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get increments() {
    		throw new Error("<Scrolly>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set increments(value) {
    		throw new Error("<Scrolly>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Scrolly>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Scrolly>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (123:3) {#each steps as text, i}
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let raw_value = /*text*/ ctx[5] + "";

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			attr_dev(div0, "class", "step-content svelte-1mz3adm");
    			add_location(div0, file, 124, 4, 2817);
    			attr_dev(div1, "class", "step svelte-1mz3adm");
    			toggle_class(div1, "active", /*value*/ ctx[1] === /*i*/ ctx[7]);
    			add_location(div1, file, 123, 5, 2767);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			div0.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value*/ 2) {
    				toggle_class(div1, "active", /*value*/ ctx[1] === /*i*/ ctx[7]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(123:3) {#each steps as text, i}",
    		ctx
    	});

    	return block;
    }

    // (122:4) <Scrolly bind:value>
    function create_default_slot(ctx) {
    	let t;
    	let div;
    	let each_value = /*steps*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div = element("div");
    			attr_dev(div, "class", "spacer svelte-1mz3adm");
    			add_location(div, file, 127, 3, 2888);
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*value, steps*/ 6) {
    				each_value = /*steps*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(122:4) <Scrolly bind:value>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let article;
    	let section0;
    	let h20;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t5;
    	let div0;
    	let t6;
    	let div3;
    	let div1;
    	let scrolly;
    	let updating_value;
    	let t7;
    	let div2;
    	let visualization;
    	let t8;
    	let div4;
    	let t9;
    	let section1;
    	let h21;
    	let t11;
    	let p2;
    	let t13;
    	let p3;
    	let t15;
    	let br0;
    	let t16;
    	let br1;
    	let t17;
    	let br2;
    	let t18;
    	let br3;
    	let t19;
    	let br4;
    	let t20;
    	let br5;
    	let t21;
    	let br6;
    	let t22;
    	let br7;
    	let t23;
    	let br8;
    	let t24;
    	let br9;
    	let t25;
    	let br10;
    	let t26;
    	let br11;
    	let t27;
    	let br12;
    	let t28;
    	let br13;
    	let t29;
    	let br14;
    	let t30;
    	let br15;
    	let t31;
    	let br16;
    	let t32;
    	let br17;
    	let t33;
    	let br18;
    	let t34;
    	let br19;
    	let t35;
    	let br20;
    	let t36;
    	let br21;
    	let t37;
    	let br22;
    	let t38;
    	let br23;
    	let t39;
    	let br24;
    	let current;

    	function scrolly_value_binding(value) {
    		/*scrolly_value_binding*/ ctx[3](value);
    	}

    	let scrolly_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	if (/*value*/ ctx[1] !== void 0) {
    		scrolly_props.value = /*value*/ ctx[1];
    	}

    	scrolly = new Scrolly({ props: scrolly_props, $$inline: true });
    	binding_callbacks.push(() => bind(scrolly, 'value', scrolly_value_binding));
    	visualization = new Boat({ $$inline: true });

    	const block = {
    		c: function create() {
    			article = element("article");
    			section0 = element("section");
    			h20 = element("h2");
    			h20.textContent = "Garbage In, Garbage Out";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Society makes a lot of trash. We're not quite sure what to do with it.";
    			t3 = space();
    			p1 = element("p");
    			p1.textContent = "Anthropomorphizing might help.";
    			t5 = space();
    			div0 = element("div");
    			t6 = space();
    			div3 = element("div");
    			div1 = element("div");
    			create_component(scrolly.$$.fragment);
    			t7 = space();
    			div2 = element("div");
    			create_component(visualization.$$.fragment);
    			t8 = space();
    			div4 = element("div");
    			t9 = space();
    			section1 = element("section");
    			h21 = element("h2");
    			h21.textContent = "Conclusions Drawn from the Visualization";
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "As we reflect on the visualization that has scrolled out of view, let's discuss the insights gathered. The movement and aggregation of circles within the defined area highlight the clustering tendency of data under certain conditions.";
    			t13 = space();
    			p3 = element("p");
    			p3.textContent = "This visualization is not just a showcase of technical prowess but serves as a metaphor for the dynamic and sometimes unpredictable nature of data analysis. Understanding these patterns allows us to anticipate changes and adapt strategies effectively.";
    			t15 = space();
    			br0 = element("br");
    			t16 = space();
    			br1 = element("br");
    			t17 = space();
    			br2 = element("br");
    			t18 = space();
    			br3 = element("br");
    			t19 = space();
    			br4 = element("br");
    			t20 = space();
    			br5 = element("br");
    			t21 = space();
    			br6 = element("br");
    			t22 = space();
    			br7 = element("br");
    			t23 = space();
    			br8 = element("br");
    			t24 = space();
    			br9 = element("br");
    			t25 = space();
    			br10 = element("br");
    			t26 = space();
    			br11 = element("br");
    			t27 = space();
    			br12 = element("br");
    			t28 = space();
    			br13 = element("br");
    			t29 = space();
    			br14 = element("br");
    			t30 = space();
    			br15 = element("br");
    			t31 = space();
    			br16 = element("br");
    			t32 = space();
    			br17 = element("br");
    			t33 = space();
    			br18 = element("br");
    			t34 = space();
    			br19 = element("br");
    			t35 = space();
    			br20 = element("br");
    			t36 = space();
    			br21 = element("br");
    			t37 = space();
    			br22 = element("br");
    			t38 = space();
    			br23 = element("br");
    			t39 = space();
    			br24 = element("br");
    			add_location(h20, file, 112, 3, 2387);
    			add_location(p0, file, 113, 3, 2423);
    			add_location(p1, file, 114, 3, 2504);
    			attr_dev(section0, "class", "article-section svelte-1mz3adm");
    			add_location(section0, file, 111, 1, 2350);
    			attr_dev(div0, "class", "spacer svelte-1mz3adm");
    			add_location(div0, file, 118, 1, 2617);
    			attr_dev(div1, "class", "steps-container svelte-1mz3adm");
    			add_location(div1, file, 120, 2, 2679);
    			attr_dev(div2, "class", "sticky svelte-1mz3adm");
    			add_location(div2, file, 130, 2, 2937);
    			attr_dev(div3, "class", "section-container svelte-1mz3adm");
    			add_location(div3, file, 119, 1, 2645);
    			attr_dev(div4, "class", "spacer svelte-1mz3adm");
    			add_location(div4, file, 136, 1, 3083);
    			add_location(h21, file, 139, 3, 3226);
    			add_location(p2, file, 140, 3, 3279);
    			add_location(p3, file, 141, 3, 3524);
    			add_location(br0, file, 142, 3, 3786);
    			add_location(br1, file, 143, 3, 3794);
    			add_location(br2, file, 144, 3, 3802);
    			add_location(br3, file, 145, 3, 3810);
    			add_location(br4, file, 146, 3, 3818);
    			add_location(br5, file, 147, 3, 3826);
    			add_location(br6, file, 148, 3, 3834);
    			add_location(br7, file, 149, 3, 3842);
    			add_location(br8, file, 150, 3, 3850);
    			add_location(br9, file, 151, 3, 3858);
    			add_location(br10, file, 152, 3, 3866);
    			add_location(br11, file, 153, 3, 3874);
    			add_location(br12, file, 154, 3, 3882);
    			add_location(br13, file, 155, 3, 3890);
    			add_location(br14, file, 156, 3, 3898);
    			add_location(br15, file, 157, 3, 3906);
    			add_location(br16, file, 158, 3, 3914);
    			add_location(br17, file, 159, 3, 3922);
    			add_location(br18, file, 160, 3, 3930);
    			add_location(br19, file, 161, 3, 3938);
    			add_location(br20, file, 162, 3, 3946);
    			add_location(br21, file, 163, 3, 3954);
    			add_location(br22, file, 164, 3, 3962);
    			add_location(br23, file, 165, 3, 3970);
    			add_location(br24, file, 166, 3, 3978);
    			attr_dev(section1, "class", "article-section conclusion svelte-1mz3adm");
    			set_style(section1, "visibility", /*conclusionVisible*/ ctx[0] ? 'visible' : 'hidden');
    			add_location(section1, file, 138, 1, 3114);
    			add_location(article, file, 110, 2, 2339);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, section0);
    			append_dev(section0, h20);
    			append_dev(section0, t1);
    			append_dev(section0, p0);
    			append_dev(section0, t3);
    			append_dev(section0, p1);
    			append_dev(article, t5);
    			append_dev(article, div0);
    			append_dev(article, t6);
    			append_dev(article, div3);
    			append_dev(div3, div1);
    			mount_component(scrolly, div1, null);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			mount_component(visualization, div2, null);
    			append_dev(article, t8);
    			append_dev(article, div4);
    			append_dev(article, t9);
    			append_dev(article, section1);
    			append_dev(section1, h21);
    			append_dev(section1, t11);
    			append_dev(section1, p2);
    			append_dev(section1, t13);
    			append_dev(section1, p3);
    			append_dev(section1, t15);
    			append_dev(section1, br0);
    			append_dev(section1, t16);
    			append_dev(section1, br1);
    			append_dev(section1, t17);
    			append_dev(section1, br2);
    			append_dev(section1, t18);
    			append_dev(section1, br3);
    			append_dev(section1, t19);
    			append_dev(section1, br4);
    			append_dev(section1, t20);
    			append_dev(section1, br5);
    			append_dev(section1, t21);
    			append_dev(section1, br6);
    			append_dev(section1, t22);
    			append_dev(section1, br7);
    			append_dev(section1, t23);
    			append_dev(section1, br8);
    			append_dev(section1, t24);
    			append_dev(section1, br9);
    			append_dev(section1, t25);
    			append_dev(section1, br10);
    			append_dev(section1, t26);
    			append_dev(section1, br11);
    			append_dev(section1, t27);
    			append_dev(section1, br12);
    			append_dev(section1, t28);
    			append_dev(section1, br13);
    			append_dev(section1, t29);
    			append_dev(section1, br14);
    			append_dev(section1, t30);
    			append_dev(section1, br15);
    			append_dev(section1, t31);
    			append_dev(section1, br16);
    			append_dev(section1, t32);
    			append_dev(section1, br17);
    			append_dev(section1, t33);
    			append_dev(section1, br18);
    			append_dev(section1, t34);
    			append_dev(section1, br19);
    			append_dev(section1, t35);
    			append_dev(section1, br20);
    			append_dev(section1, t36);
    			append_dev(section1, br21);
    			append_dev(section1, t37);
    			append_dev(section1, br22);
    			append_dev(section1, t38);
    			append_dev(section1, br23);
    			append_dev(section1, t39);
    			append_dev(section1, br24);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const scrolly_changes = {};

    			if (dirty & /*$$scope, value*/ 258) {
    				scrolly_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_value && dirty & /*value*/ 2) {
    				updating_value = true;
    				scrolly_changes.value = /*value*/ ctx[1];
    				add_flush_callback(() => updating_value = false);
    			}

    			scrolly.$set(scrolly_changes);

    			if (!current || dirty & /*conclusionVisible*/ 1) {
    				set_style(section1, "visibility", /*conclusionVisible*/ ctx[0] ? 'visible' : 'hidden');
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(scrolly.$$.fragment, local);
    			transition_in(visualization.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(scrolly.$$.fragment, local);
    			transition_out(visualization.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    			destroy_component(scrolly);
    			destroy_component(visualization);
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
    	let conclusionVisible = false;
    	let value;

    	const steps = [
    		"<p>Welcome to the Jones Falls stream in Baltimore, Maryland. </p><p> Meet Mr. Trash Wheel®",
    		"<p>Mr. Trash Wheel® has a simple job. And that job is to consume garbage.",
    		"<p>Here comes some now.</p>",
    		"<p>This is one plastic bottle.</p>",
    		"<p>Here is a cigarette butt.</p>",
    		"<p>Anyone missing a ball? A glass bottle? Polyethylene? An old wrapper?</p>",
    		"<p>Let's see how much garbage comes through in a typical day.</p>"
    	];

    	function updateConclusionVisibility() {
    		document.querySelector('.conclusion');
    		const visualizationEnd = document.querySelector('.spacer:last-of-type').getBoundingClientRect().top;
    		$$invalidate(0, conclusionVisible = visualizationEnd < 0);
    	}

    	onMount(() => {
    		window.addEventListener('scroll', updateConclusionVisibility);

    		return () => {
    			window.removeEventListener('scroll', updateConclusionVisibility);
    		};
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function scrolly_value_binding(value$1) {
    		value = value$1;
    		$$invalidate(1, value);
    	}

    	$$self.$capture_state = () => ({
    		Visualization: Boat,
    		Scrolly,
    		conclusionVisible,
    		value,
    		steps,
    		updateConclusionVisibility,
    		onMount
    	});

    	$$self.$inject_state = $$props => {
    		if ('conclusionVisible' in $$props) $$invalidate(0, conclusionVisible = $$props.conclusionVisible);
    		if ('value' in $$props) $$invalidate(1, value = $$props.value);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [conclusionVisible, value, steps, scrolly_value_binding];
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

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
