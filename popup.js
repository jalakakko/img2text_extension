const image = document.getElementById('imageid');
const img_container = document.getElementById('img_container');
const gray_button = document.getElementById('grayscale_button');
const invert_button = document.getElementById('invert_button');
const bnw_button = document.getElementById('blacknwhite_button');
const sat_slider = document.getElementById('sat_slider');
sat_slider.style.setProperty('--sliderImg', "url('contrast_disabled.png')");
let convert_button_active = false;
let transit_init = false;
let init = false;
let resetting = false;
let imgdata, original_imgdata, original_imgdata2, screenshotUrl; 

document.addEventListener('DOMContentLoaded', function() { 
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
        chrome.tabs.captureVisibleTab(null, {}, function(c) { 
            image.src = c; 
            screenshotUrl = c;
        });
    }); 
}); 

let cropping = true;

let mouseCoordinates = {
    mousedownX : 0,
    mousedownY : 0,
    mouseupX : 0,
    mouseupY : 0
};

let canvas = document.createElement("canvas"); 
canvas.width = image.width;
canvas.height = image.height;

canvas.style.position="absolute";
canvas.style.left=image.scrollX+"px";
canvas.style.top=image.scrollY+"px";
canvas.style.zIndex=100000;
canvas.style.pointerEvents="none"; 
let ctx = canvas.getContext("2d", { willReadFrequently: true });
ctx.beginPath();
ctx.rect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "rgba(0,0,0, 0.4)";
ctx.fill();
document.body.appendChild(canvas);
    
image.onmousedown = (e) => {  
    if (cropping) { 
        e.preventDefault();
        image.onmousemove = (e2) => {
            let drawWidth = (e2.clientX - e.clientX);
            let drawHeight =  (e2.clientY - e.clientY); 
            
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.beginPath()
            ctx.rect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(0,0,0, 0.4)";
            ctx.fill();
            ctx.clearRect(e.clientX, e.clientY, drawWidth, drawHeight); 
        }
        
        mouseCoordinates.mousedownX = resizePixelRatio(e.clientX);
        mouseCoordinates.mousedownY = resizePixelRatio(e.clientY);
    }   
};

image.onmouseup = (e) => { 
    if (cropping) {
        cropping = false;
        image.onmousemove = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        mouseCoordinates.mouseupX = resizePixelRatio(e.clientX);
        mouseCoordinates.mouseupY = resizePixelRatio(e.clientY); 

        let screenshot = new Image();
        screenshot.setAttribute("id", "imageID");
        let screenshotCanvas = document.createElement('canvas'); 
        screenshot.src = screenshotUrl;

        setTimeout(() => {
            screenshotCanvas.width = screenshot.width;
            screenshotCanvas.height = screenshot.height;

            let croppedWidth = mouseCoordinates.mouseupX - mouseCoordinates.mousedownX;
            let croppedHeight = mouseCoordinates.mouseupY - mouseCoordinates.mousedownY;  

            let croppedCanvas = document.createElement('canvas');
            let croppedctx = croppedCanvas.getContext('2d');  
            let multiplierWidth = canvas.width / croppedWidth;
            let multiplierHeight = canvas.height / croppedHeight;
            let multiplier_x = screenshot.width / canvas.width;
            let multiplier_y = screenshot.height / canvas.height; 
            let sx = Math.round(mouseCoordinates.mousedownX * multiplier_x);
            let sy = Math.round(mouseCoordinates.mousedownY * multiplier_y);

            croppedWidth = Math.round(screenshot.width / multiplierWidth); 
            croppedHeight = Math.round(screenshot.height / multiplierHeight);  
            croppedCanvas.width = croppedWidth;
            croppedCanvas.height = croppedHeight;  
                
            croppedctx.drawImage(screenshot, sx, sy, croppedWidth, croppedHeight,
                0, 0, croppedWidth, croppedHeight); 

            if (croppedCanvas.height > image.height) {
                let new_styles = `
                display: block;
                margin-left: auto;
                margin-right: auto;
                width: 50%; 
                `;
                image.style.cssText = new_styles; 
            };

            if (croppedCanvas.width > image.width
                && croppedCanvas.height < image.height) {
                let new_styles = `
                display: flex;
                justify-content: start;
                align-items: center;
                `;
                img_container.style.cssText = new_styles;
            }

            if (croppedCanvas.width < image.width
                && croppedCanvas.height < image.height) {
                let new_styles = `
                display: flex;
                justify-content: center;
                align-items: center;
                `;
                img_container.style.cssText = new_styles;
            };

            image.width = croppedCanvas.width;
            image.height = croppedCanvas.height;
            image.style.width = croppedCanvas.width;
            image.style.height = croppedCanvas.height;

            image.src = croppedCanvas.toDataURL(); 

            if (!convert_button_active) {
                const convert_button = document.createElement('button');
                const t = document.createTextNode("Convert");
                convert_button.appendChild(t);
                let new_styles = `
                    position: fixed;
                    top: 8;
                    left: 50%;
                    transform: translate(-50%);
                    color: white;
                    text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
                    font-size: 60px;
                    font-weight: bold;
                    padding: 10px 10px;
                    border: none;
                    border-radius: 1px;
                    cursor: pointer;
                    width: 710px;
                    height: 415px;
                `;
                convert_button.style.cssText = new_styles;  
                
                convert_button.addEventListener("mouseover", () => {
                    convert_button.style.opacity = 0.5;
                    convert_button.style.backgroundColor = "#5c8cec";
                });
                convert_button.addEventListener("mouseout", () => {''
                    convert_button.style.opacity = 0;
                    convert_button.style.backgroundColor = "#9dbcfa";
                }); 
                
                convert_button.addEventListener('click', () => { 
                    image_to_text(image.src);
                });
                document.body.append(convert_button); 
            };
            convert_button_active = true;    
        }, 100); 

        setTimeout(() => {
            if (!transit_init) {
                let canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;  
                canvas.style.cssText = "";
                ctx = canvas.getContext('2d', { willReadFrequently: true });  
                let input = parseInt(sat_slider.value); 
                let states = [gray_button.checked, invert_button.checked, bnw_button.checked]; 
                
                if (!init) {
                    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
                    imgdata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
                    original_imgdata = Uint8ClampedArray.from(imgdata.data);
                    original_imgdata2 = Uint8ClampedArray.from(imgdata.data);
                    init = true;
                };
            
                image.onload = () => {    
                    if (states.every((x) => x === false && resetting)) {
                        ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
                        imgdata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
                        original_imgdata = Uint8ClampedArray.from(imgdata.data);
                        original_imgdata2 = Uint8ClampedArray.from(imgdata.data);
                        sat_slider.value = 128;     
                        resetting = false;
                    }
                };
                    
                gray_button.addEventListener('change', () => {    
                    states = [gray_button.checked, invert_button.checked, bnw_button.checked];   
                    let src = modify_image(image, ctx, canvas, states, original_imgdata, original_imgdata2, input);
                    image.src = src;
                });
            
                invert_button.addEventListener('change', () => {   
                    states = [gray_button.checked, invert_button.checked, bnw_button.checked];   
                    let src = modify_image(image, ctx, canvas, states, original_imgdata, original_imgdata2, input);
                    image.src = src; 
                    
                });
            
                bnw_button.addEventListener('change', (e) => {  
                    states = [gray_button.checked, invert_button.checked, bnw_button.checked]; 
                    let src = modify_image(image, ctx, canvas, states, original_imgdata, original_imgdata2, input);
                    image.src = src;
                    if (e.target.checked) {
                        sat_slider.style.setProperty('--sliderImg', "url('contrast.png')");
                        sat_slider.disabled = false;
                    } else {
                        sat_slider.style.setProperty('--sliderImg', "url('contrast_disabled.png')");
                        sat_slider.value = 128;   
                        sat_slider.disabled = true; 
                        original_imgdata2 = Uint8ClampedArray.from(original_imgdata); 
                        let src = modify_image(image, ctx, canvas, states, original_imgdata, original_imgdata2, input);
                        image.src = src;
                    } 
                });
            
                sat_slider.addEventListener('input', () => {
                    states = [gray_button.checked, invert_button.checked, bnw_button.checked];
                    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height); 
                    let imgdata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);  
                    let input = parseInt(sat_slider.value); 
            
                    for (var i=0; i<original_imgdata2.length; i+=4) {
                        if (original_imgdata[i] < input) {
                            original_imgdata2[i] = 0;
                            original_imgdata2[i+1] = 0;
                            original_imgdata2[i+2] = 0;
                        } else {
                            original_imgdata2[i] = 255;
                            original_imgdata2[i+1] = 255;
                            original_imgdata2[i+2] = 255;
                        };
                    };  
                    imgdata.data.set(original_imgdata2);
                    ctx.putImageData(imgdata, 0, 0);
                    image.src = canvas.toDataURL();
                });    
            };
            transit_init = true;
        }, 1000);
    };         
}; 

function grayscale(pxls) { 
    for (var i=0; i<pxls.length; i+=4) {
        let lightness = parseInt((pxls[i] + pxls[i+1] + pxls[i+2]) / 3);
        pxls[i] = lightness;
        pxls[i+1] = lightness;
        pxls[i+2] = lightness;
    }; 
    return pxls; 
};

function invert_colors(pxls) { 
    for (var i=0; i<pxls.length; i+=4) {
        pxls[i] = 255 - pxls[i];
        pxls[i+1] = 255 - pxls[i+1];
        pxls[i+2] = 255 - pxls[i+2];
    }; 
    return pxls; 
}; 

function black_n_white(pxls, original_imgdata, input) { 
    for (var i=0; i<pxls.length; i+=4) { 
        if (original_imgdata[i] < input) {
            pxls[i] = 0;
            pxls[i+1] = 0;
            pxls[i+2] = 0;
        } else {
            pxls[i] = 255;
            pxls[i+1] = 255;
            pxls[i+2] = 255;
        };
    };
    return pxls; 
};

function modify_image(
    image,
    ctx,
    canvas,
    states,
    original_imgdata,
    original_imgdata2,
    input ) {
        ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height); 
        let imgdata = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        let org = Uint8ClampedArray.from(original_imgdata);
        let img = Uint8ClampedArray.from(original_imgdata2);
        imgdata.data.set(img);
        let pxls;

        if (states.every((x) => x===false)) {
            imgdata.data.set(org);
            ctx.putImageData(imgdata, 0, 0);
            let src = canvas.toDataURL();
            resetting = true;
            return src; 
        };
        if (states[0]) {
            pxls = grayscale(imgdata.data);
        };
        if (states[2]) {
            pxls = black_n_white(imgdata.data, original_imgdata2, input);
        };
        if (states[1]) {
            pxls = invert_colors(imgdata.data); 
        };
        imgdata.data.set(pxls);
        ctx.putImageData(imgdata, 0, 0);
        let src = canvas.toDataURL();
        return src;
}; 


function resizePixelRatio(val) { 
    let result = Math.round(val * window.devicePixelRatio)
    return result
};


function image_to_text(url) { 
    chrome.tabs.query({currentWindow: true, active: true}, (tabs) => { 
        chrome.tabs.sendMessage(tabs[0].id, {command: "convert", url: url} );
    });
};