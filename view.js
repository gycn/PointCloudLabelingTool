function PCViews(views, target, scene, renderer, container) {
    this.views = views;
    this.target = target;
    this.scene = scene;
    this.renderer = renderer;
    this.container = container;
    this.currentView = null;

    var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.03), new THREE.MeshBasicMaterial({color: 0xffffff}));
    sphere.position = target;
    this.scene.add( sphere );

    var quat = new THREE.Quaternion().setFromUnitVectors( new THREE.Vector3(0, 0, 1), new THREE.Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();
    
    this.MOUSE_CORRECTION_FACTOR = 80.0;
    this.MOVE_CORRECTION_FACTOR = 0.3;
    this.VERTICAL = new THREE.Vector3(0, 0, 1);
    
    // Move camera along axis between camera and target
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
    
    // Rotate camera about vertical axis and axis orthogonal to vertical axis and axis between camera and target
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
    
    // Rotate about vertical axis
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

    // Set up cameras
    for (var i = 0; i < this.views.length; i++) {
        var camera = new THREE.PerspectiveCamera( 75, this.container.offsetWidth / this.container.offsetHeight, 0.1, 1000 );
        camera.up = this.VERTICAL;
        camera.position.copy(this.views[i].position);
        camera.lookAt(this.target);
        rotate_X(camera, 0, 0, this.target);
        zoom(camera, 0, this.target);
        this.views[i].camera = camera;
    }
    
    var mouseX = 0;
    var mouseY = 0;
    var mouseDown = false;

    this.handleMouseDown = function(e) {
        mouseDown = true;
    }

    this.handleMouseUp = function(e) {
        mouseDown = false;
    }

    this.handleMouseMove = function(e) {
        if (mouseDown) {
            // Rotate when dragging
            var dx = e.clientX - mouseX;
            var dy = e.clientY - mouseY;

            if (this.currentView.restrictDrag) {
                rotate_X(this.currentView.camera, dx / this.MOUSE_CORRECTION_FACTOR, dy / this.MOUSE_CORRECTION_FACTOR, this.target);
            } else {
                rotate_XY(this.currentView.camera, dx / this.MOUSE_CORRECTION_FACTOR, dy / this.MOUSE_CORRECTION_FACTOR, target);
            }
        } else {
            // Find view that mouse is currently hovering over
            var x = e.clientX / this.container.offsetWidth;
            var y = e.clientY / this.container.offsetHeight;

            for (var i = 0; i < this.views.length; i++) {
                if (x >= this.views[i].left && x <= this.views[i].left + this.views[i].width &&
                    y >= this.views[i].top && y <= this.views[i].top + this.views[i].height) {
                    this.currentView = this.views[i];
                    break;
                }
            }
        }

        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    this.handleMouseWheel = function(e) {
        zoom(this.currentView.camera, e.deltaY / this.MOUSE_CORRECTION_FACTOR, target);
    }

    var UP_KEY = 38;
    var DOWN_KEY = 40;
    var LEFT_KEY = 37;
    var RIGHT_KEY = 39;
    var PERIOD_KEY = 190;
    var SLASH_KEY = 191;

    this.MOVE_UP = new THREE.Vector3(0, 0, 0.2);
    this.MOVE_DOWN = new THREE.Vector3(0, 0, -0.2);

    this.calculateForward = function() {
        var forward = new THREE.Vector3();
        for (var i = 0; i < this.views.length; i++) {
            var x = mouseX / this.container.offsetWidth;
            var y = mouseY / this.container.offsetHeight;

            if (x >= this.views[i].left && x <= this.views[i].left + this.views[i].width &&
                y >= this.views[i].top && y <= this.views[i].top + this.views[i].height) {
                forward.copy(target);
                forward.sub(this.views[i].camera.position);
                forward.z = 0;
                forward.normalize();
                forward.multiplyScalar(this.MOVE_CORRECTION_FACTOR);
                break;
            }
        }
        return forward;
    }

    this.calculateLeft = function(forward) {
        var left = new THREE.Vector3();
        left.crossVectors(this.VERTICAL, forward);
        left.normalize();
        left.multiplyScalar(this.MOVE_CORRECTION_FACTOR);
        return left;
    }

    this.handleKeyDown = function(e) {
        // Move target and camera depending on which key is pressed
        switch(e.keyCode) {
            case PERIOD_KEY:
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(this.MOVE_UP);
                }
                target.add(this.MOVE_UP);
                sphere.position.copy(target);
                break;
            case SLASH_KEY:
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(this.MOVE_DOWN);
                }
                target.add(this.MOVE_DOWN);
                sphere.position.copy(target);
                break;
            case UP_KEY:
                var forward = this.calculateForward();
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(forward);
                }
                target.add(forward);
                sphere.position.copy(target);
                break;
            case DOWN_KEY:
                var forward = this.calculateForward();
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.sub(forward);
                }
                target.sub(forward);
                sphere.position.copy(target);
                break;
            case LEFT_KEY:
                var forward = this.calculateForward();
                var left = this.calculateLeft(forward);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.add(left);
                }
                target.add(left);
                sphere.position.copy(target);
                break;
            case RIGHT_KEY:
                var forward = this.calculateForward();
                var left = this.calculateLeft(forward);
                for (var i = 0; i < this.views.length; i++) {
                    this.views[i].camera.position.sub(left);
                }
                target.sub(left);
                sphere.position.copy(target);
                break;
        }
    }
    
    this.render = function () {
        // Loop through each view and render
        for (var i = 0; i < this.views.length; i++) {
            var view = this.views[i];
            var camera = this.views[i].camera;

            var left   = Math.floor( this.container.offsetWidth * view.left );
            var top    = Math.floor( this.container.offsetHeight * view.top );
            var width  = Math.floor( this.container.offsetWidth * view.width );
            var height = Math.floor( this.container.offsetHeight * view.height );

            renderer.setViewport( left, top, width, height );
            renderer.setScissor( left, top, width, height );
            renderer.setScissorTest( true );

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            this.renderer.render(this.scene, camera);
       }
    };
}
