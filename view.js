function PCViews(views, target, scene, renderer, container) {
    this.views = views;
    this.target = target;
    this.scene = scene;
    this.renderer = renderer;
    this.container = container;

    var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({color: 0xffffff}));
    sphere.position = target;
    this.scene.add( sphere );

    var mouseDown = false;

    var quat = new THREE.Quaternion().setFromUnitVectors( new THREE.Vector3(0, 0, 1), new THREE.Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();
    
    var MOUSE_CORRECTION_FACTOR = 80.0;
    var MOVE_CORRECTION_FACTOR = 0.3;
    var VERTICAL = new THREE.Vector3(0, 0, 1);
    
    function zoom (camera, dy, target) {
        var offset = new THREE.Vector3();
        offset.copy(camera.position);
        offset.sub(target);
    
        var spherical = new THREE.Spherical();
        spherical.setFromVector3(offset);
    
        spherical.radius *= 1 - dy;
    
        offset.setFromSpherical(spherical);
    
        offset.add(target);
    
        camera.position.copy(offset);
    
        camera.lookAt(target);
    }
    
    function rotate_XY(camera, dx, dy, target) {
        var offset = new THREE.Vector3();
        offset.copy(camera.position);
        offset.sub(target);
    
        offset.applyQuaternion(quat);
    
        var spherical = new THREE.Spherical();
        spherical.setFromVector3(offset);
    
        spherical.theta += dx;
        spherical.phi += dy;
    
        spherical.phi = Math.max(0, Math.min(Math.PI, spherical.phi));
    
        spherical.makeSafe();
    
        offset.setFromSpherical(spherical);
        offset.applyQuaternion(quatInverse);
    
        offset.add(target);
    
        camera.position.copy(offset);
    
        camera.lookAt(target);
    }
    
    function rotate_X(camera, dx, dy, target) {
        var offset = new THREE.Vector3();
        offset.copy(camera.position);
        offset.sub(target);
    
        offset.applyQuaternion(quat);
    
        var spherical = new THREE.Spherical();
        spherical.setFromVector3(offset);
    
        spherical.theta += dx;
    
        spherical.makeSafe();
    
        offset.setFromSpherical(spherical);
        offset.applyQuaternion(quatInverse);
    
        offset.add(target);
    
        camera.position.copy(offset);
    
        camera.lookAt(target);
    }


    for (var i = 0; i < this.views.length; i++) {
        var camera = new THREE.PerspectiveCamera( 75, container.offsetWidth / container.offsetHeight, 0.1, 1000 );
        camera.up = VERTICAL;
        camera.position.copy(this.views[i].position);
        camera.lookAt(this.target);
        rotate_X(camera, 0, 0, this.target);
        zoom(camera, 0, this.target);
        this.views[i].camera = camera;
    }

    this.handleMouseDown = function(e) {
        mouseDown = true;
    }

    this.handleMouseUp = function(e) {
        mouseDown = false;
    }

    this.handleMouseMove = function(e) {
        if (mouseDown) {
            var dx = e.clientX - mouseX;
            var dy = e.clientY - mouseY;

            for (var i = 0; i < views.length; i++) {
                var x = e.clientX / main_container.offsetWidth;
                var y = e.clientY / main_container.offsetHeight;

                if (x >= this.views[i].left && x <= this.views[i].left + this.views[i].width &&
                    y >= this.views[i].top && y <= this.views[i].top + this.views[i].height) {
                    if (this.views[i].restrictDrag) {
                        rotate_X(this.views[i].camera, dx / MOUSE_CORRECTION_FACTOR, dy / MOUSE_CORRECTION_FACTOR, target);
                    } else {
                        rotate_XY(this.views[i].camera, dx / MOUSE_CORRECTION_FACTOR, dy / MOUSE_CORRECTION_FACTOR, target);
                    }
                }
            }
        }
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    this.handleMouseWheel = function(e) {
        for (var i = 0; i < views.length; i++) {
            var x = e.clientX / main_container.offsetWidth;
            var y = e.clientY / main_container.offsetHeight;

            if (x >= this.views[i].left && x <= this.views[i].left + this.views[i].width &&
                y >= this.views[i].top && y <= this.views[i].top + this.views[i].height) {
                zoom(views[i].camera, e.deltaY / MOUSE_CORRECTION_FACTOR, target);
            }
        }
    }

    var UP_KEY = 38;
    var DOWN_KEY = 40;
    var LEFT_KEY = 37;
    var RIGHT_KEY = 39;
    var PERIOD_KEY = 190;
    var SLASH_KEY = 191;

    var MOVE_UP = new THREE.Vector3(0, 0, 0.2);
    var MOVE_DOWN = new THREE.Vector3(0, 0, -0.2);

    function calculateForward(views) {
        var forward = new THREE.Vector3();
        for (var i = 0; i < views.length; i++) {
            var x = mouseX / container.offsetWidth;
            var y = mouseY / container.offsetHeight;

            if (x >= views[i].left && x <= views[i].left + views[i].width &&
                y >= views[i].top && y <= views[i].top + views[i].height) {
                forward.copy(target);
                forward.sub(views[i].camera.position);
                forward.z = 0;
                forward.normalize();
                forward.multiplyScalar(MOVE_CORRECTION_FACTOR);
                break;
            }
        }
        return forward;
    }

    function calculateLeft(forward) {
        var left = new THREE.Vector3();
        left.crossVectors(VERTICAL, forward);
        left.normalize();
        left.multiplyScalar(MOVE_CORRECTION_FACTOR);
        return left;
    }

    this.handleKeyDown = function(e) {
        switch(e.keyCode) {
            case PERIOD_KEY:
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(MOVE_UP);
                }
                target.add(MOVE_UP);
                sphere.position.copy(target);
                break;
            case SLASH_KEY:
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(MOVE_DOWN);
                }
                target.add(MOVE_DOWN);
                sphere.position.copy(target);
                break;
            case UP_KEY:
                var forward = calculateForward(this.views);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(forward);
                }
                target.add(forward);
                sphere.position.copy(target);
                break;
            case DOWN_KEY:
                var forward = calculateForward(this.views);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.sub(forward);
                }
                target.sub(forward);
                sphere.position.copy(target);
                break;
            case LEFT_KEY:
                var forward = calculateForward(this.views);
                var left = calculateLeft(forward);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(left);
                }
                target.add(left);
                sphere.position.copy(target);
                break;
            case RIGHT_KEY:
                var forward = calculateForward(this.views);
                var left = calculateLeft(forward);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.sub(left);
                }
                target.sub(left);
                sphere.position.copy(target);
                break;
        }
    }
    
    this.render = function () {
        for (var i = 0; i < this.views.length; i++) {
            var view = this.views[i];
            var camera = this.views[i].camera;

            var left   = Math.floor( container.offsetWidth * view.left );
            var top    = Math.floor( container.offsetHeight * view.top );
            var width  = Math.floor( container.offsetWidth * view.width );
            var height = Math.floor( container.offsetHeight * view.height );

            renderer.setViewport( left, top, width, height );
            renderer.setScissor( left, top, width, height );
            renderer.setScissorTest( true );

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            this.renderer.render(this.scene, camera);
       }
    };
}
