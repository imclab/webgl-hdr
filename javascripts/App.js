var app = (function () {
    var module = {};

    // Private vars
    var stats,
        container,
        renderer,
        gui,

        // Filters
        pngDecoder,

        // TMOs
        noneTMO,
        durand02TMO,

        // WebGL extensions
        glExtFT;

    // Private functions
    function loop() {
        // TODO: pass params to Filter#process instead
        module.currentTMO.material.uniforms.fExposure.value = module.settings.exposure;

        // Map HDR image to LDR
        module.currentTMO.process(renderer, true);

        // Mark end of frame for WebGL Inspector
        if ( glExtFT ) glExtFT.frameTerminator();

        if ( module.statsEnabled ) stats.update();
    }

    // Public vars
    module.statsEnables = true;
    module.currentTMO = undefined;

    // TMO attributes
    module.settings = {
        exposure: 0.3
    };

    // Public methods
    module.init = function () {
        var self = this;

        container = document.createElement( 'div' );
        document.body.appendChild( container );

        // Stats
        if ( this.statsEnabled ) {
            stats = new Stats();
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.top = '0px';
            stats.domElement.style.zIndex = 100;
            container.appendChild( stats.domElement );
        }

        // GUI
        gui = new GUI();
        gui.add(this.settings, "exposure", 0, 10, 0.025).name("Exposure");
        gui.show();

        // Load image
        var imageTexture = ImageUtils.loadTexture( "images/memorial.png", new THREE.UVMapping(), function (image) {
            imageTexture.width = image.width;
            imageTexture.height = image.height;

            // Renderer
            renderer = new THREE.WebGLRenderer( false );
            renderer.setSize( image.width, image.height );
            container.appendChild( renderer.domElement );

            // Enable floating point texture extension
            if ( !renderer.context.getExtension("OES_texture_float") ) {
                alert("Your browser doesn't support required OES_texture_float extension.");
                return;
            }

            // Enable 'WebGL Inspector' frame termination extension
            glExtFT = renderer.context.getExtension("GLI_frame_terminator");

            // Load all shaders
            ShaderUtils.load(["vs/basic", "fs/png_decode", "fs/rgb2y", "vs/bilateral", "fs/bilateral", "fs/tmo/none", "fs/tmo/Durand02"], function (err, shaders) {
                if (err) {
                    alert("Couldn't load all shaders.");
                    return;
                }

                // Setup filters
                pngDecoder = new THREE.filters.PNGHDRDecode(imageTexture, shaders);
                noneTMO = new THREE.filters.NoneTMO(pngDecoder.renderTarget, shaders);
                durand02TMO = new THREE.filters.Durand02TMO(pngDecoder.renderTarget, shaders);

                // TODO: allow to switch current TMO
                self.currentTMO = durand02TMO;

                // Decode HDR image file
                pngDecoder.process(renderer);

                // Render loop
                setInterval( loop, 1000 / 60);
            });
        });

        imageTexture.min_filter = THREE.LinearFilter;
        imageTexture.mag_filter = THREE.LinearFilter;
    };

    return module;
})();

// Start the app
app.init();
