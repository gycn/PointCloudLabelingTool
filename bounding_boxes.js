function BoundingBoxes(scene, pc_views) {
    this.bounding_boxes = [];
    var raycaster = new THREE.Raycaster();
    this.scene = scene;
    this.selection = null;
    this.pc_views = pc_views;

    var STANDBY = 0;
    var ADJUSTING = 1;
    var EDITING = 2;

    var boundingBoxesState = 0;
    var selectionNewBox = false;
    
    // Add new bounding box into world
    this.addBoundingBox = function() {
        // Check to make sure not currently editing any bounding boxes
        if (boundingBoxesState == STANDBY) {
            // Create box
            var box = new THREE.Mesh( 
                new THREE.BoxGeometry( 1, 1, 0.01 ), 
                new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.5})
            );
            
            // Move box to view location
            box.position.copy(this.pc_views.target);
            
            // Create outline
            var edges = new THREE.EdgesGeometry( box.geometry );
            var outline = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
            
            // Add box and outline to scene
            this.scene.add(outline);
            this.scene.add(box);
            box.outline = outline;
            outline.box = box;
            
            // Append box to array and select
            this.bounding_boxes.push(box);
            this.select(box);
            
            // Set state to adjusting
            selectionNewBox = true;
            boundingBoxesState = ADJUSTING;
        }

    };
    
    // Variables for holding the box the mouse is currently hovering over
    var boxMouseOver = null;
    var boxMouseOverPoint = null;
    
    // Convert XY coordinates from mouse space to normalized device coordinates based on the view
    function convertMouseToNDC (mX, mY, pc_views) {
        var x = mX / pc_views.container.offsetWidth;
        var y = mY / pc_views.container.offsetHeight;
        var camera = pc_views.currentView.camera;
        x -= pc_views.currentView.left;
        x /= pc_views.currentView.width;
        x = 2 * x - 1;
        y -= pc_views.currentView.top;
        y /= pc_views.currentView.height;
        y = -2 * y + 1;

        return [x, y];
    }
    
    // Find which box the mouse is hovering over
    this.highlightMouseHover = function(mX, mY) {

        var NDC = convertMouseToNDC(mX, mY, this.pc_views);
        var x = NDC[0];
        var y = NDC[1];

        // Set up raycaster
        raycaster.setFromCamera(new THREE.Vector2(x, y), this.pc_views.currentView.camera);
        
        var intersects = raycaster.intersectObjects(this.bounding_boxes);
        
        // Unhighlight previous box
        if (boxMouseOver != null) {
            boxMouseOver.outline.material.color.set(0xffffff);
            boxMouseOver = null;
        }
        
        // Highlight current box
        if (intersects.length > 0) {
            boxMouseOver = intersects[0].object;
            boxMouseOver.outline.material.color.set(0xff0000);
            boxMouseOverPoint = intersects[0].point;
        }
    }
    
    // Change selection to box
    this.select = function(box) {
        var temp = this.selection;
        this.deselect();
        
        // If selecting same thing, then only deselect
        if (temp != box) {
            this.selection = box;
            this.selection.material.color.set(0xff0000);
        }
    }
    
    // Deselect current selection
    this.deselect = function() {
        if (this.selection != null) {
            this.selection.material.color.set(0xffffff);
            this.selection = null;
        }
    }
    
    // For holding mouse coordinates
    var mouseX = 0;
    var mouseY = 0;
    
    // Calculate projection from screen space to world space in current view
    function calculateProjectionFromMouse(mX, mY) {
        // Convert mX and mY to NDC
        var NDC = convertMouseToNDC(mX, mY, this.pc_views); 

        var projection = new THREE.Vector3(NDC[0], NDC[1], 0.5);

        projection.unproject(this.pc_views.currentView.camera);

        projection.sub(this.pc_views.currentView.camera.position);

        return projection;
    }
    
    // Variables for holding parameters for moving box along the view plane
    var viewPlaneNormal = new THREE.Vector3();
    var viewPlanePoint = null;
    var viewPlaneOffset = new THREE.Vector3();
    
    // Move box along a plane parallel to the view that intersects the box's current position
    var moveBoxAlongViewPlane = function(mX, mY, box) {
        var projection = calculateProjectionFromMouse(mX, mY);

        var dist = -viewPlaneNormal.dot(viewPlaneNormal) / projection.dot(viewPlaneNormal);

        projection.multiplyScalar(dist);
        projection.add(this.pc_views.currentView.camera.position);
        projection.add(viewPlaneOffset);

        box.position.copy(projection);
        box.outline.position.copy(projection);
    }
    
    // Rotate box on z axis
    function rotateBox(dx, box) {
        box.rotateOnAxis(pc_views.VERTICAL, dx);

        box.outline.rotateOnAxis(pc_views.VERTICAL, dx);
    }
    
    // Scale box based on mouse position
    var scaleBox = function(mX, mY, box) {
        var camera = this.pc_views.currentView.camera;

        var projection = calculateProjectionFromMouse(mX, mY); 
        var dist = (box.position.z - camera.position.z) / projection.z;
        projection.multiplyScalar(dist);

        var boxPlanePoint = new THREE.Vector3();
        boxPlanePoint.copy(camera.position);
        boxPlanePoint.add(projection);
        
        box.worldToLocal(boxPlanePoint);

        box.scale.x = boxPlanePoint.x * box.scale.x * 2;
        box.outline.scale.x = boxPlanePoint.x * box.scale.x * 2;
        box.scale.y = boxPlanePoint.y * box.scale.y * 2;
        box.outline.scale.y = boxPlanePoint.y * box.scale.y * 2;
    }
    
    // Edit state FSM
    var MOVING_BOX = 1;
    var ROTATING_BOX = 2;
    var SCALING_BOX = 3; 
    var EXTRUDING_BOX = 4;

    var boxEditState = MOVING_BOX;

    // Change edit state based on key presses
    this.handleMouseDown = function(e) {
        if (boundingBoxesState == STANDBY) {
            if (boxMouseOver != null) {
                this.select(boxMouseOver);
            } 
        } else if (boundingBoxesState == ADJUSTING) {
            if (this.selection == boxMouseOver) {
                boundingBoxesState = EDITING;

                if (boxEditState == MOVING_BOX) {
                    viewPlanePoint = this.selection.position;

                    viewPlaneNormal.copy(this.pc_views.currentView.camera.position);
                    viewPlaneNormal.sub(viewPlanePoint);

                    viewPlaneOffset.copy(this.selection.position);
                    viewPlaneOffset.sub(boxMouseOverPoint);
                }

                return true;
            }
        }
        return false;
    }
    
    // Reset box states when drag stops
    this.handleMouseUp = function(e) {
        if (boundingBoxesState == EDITING) {
            boundingBoxesState = ADJUSTING;
            boxEditState = MOVING_BOX;
        }
    }
    
    // Handle box editing and highlights
    this.handleMouseMove = function(e) {
        if (this.pc_views.currentView == null)
            return false;

        this.highlightMouseHover(e.clientX, e.clientY);

        var consume = false;

        if (boundingBoxesState == EDITING) {
            if (boxEditState == MOVING_BOX)
                moveBoxAlongViewPlane(e.clientX, e.clientY, this.selection);
            else if (boxEditState == ROTATING_BOX)
                rotateBox((e.clientX - mouseX) / this.pc_views.MOUSE_CORRECTION_FACTOR, this.selection);
            else if (boxEditState == SCALING_BOX)
                scaleBox(e.clientX, e.clientY, this.selection);
            consume = true;
        }

        mouseX = e.clientX;
        mouseY = e.clientY;

        return consume;
    }

    var ESCAPE_KEY = 27;
    var R_KEY = 82;
    var S_KEY = 83;
    var E_KEY = 69;
    
    // Set edit state FSM based on key press
    this.handleKeyDown = function(e) {
        switch(e.keyCode) {
            case ESCAPE_KEY:
                if (selectionNewBox) {
                    var box = this.bounding_boxes.pop();
                    scene.remove(box.outline);
                    scene.remove(box);
                    selectionNewBox = false;
                }

                boundingBoxesState = STANDBY;
                this.deselect();
                break;
            case R_KEY:
                if (boundingBoxesState != EDITING)
                    boxEditState = ROTATING_BOX;
                break;
            case S_KEY:
                if (boundingBoxesState != EDITING)
                    boxEditState = SCALING_BOX;
                break;
            case E_KEY:
                if (boundingBoxesState != EDITING)
                    boxEditState = EXTRUDING_BOX;
                break;
        }
    }
    
    // Reset edit box FSM when key is released
    this.handleKeyUp = function(e) {
        if (boundingBoxesState != EDITING)
            boxEditState = MOVING_BOX;    
    }
}
