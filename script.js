class Game_engine{
    player;
    properties;
    buttons;
    button_size;
    canvas;
    ctx;
    fps;
    input_stack;
    key;
    goal_number;
    current_number;
    already_collided;
    end;
    player_sprite;
    state;
    frame;
    frame_count;
    image_background;
    image_on;
    image_off;
    image_idle;
    image_left;
    image_right;


    //MISC ------------------------------------------------------------
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    //I was never so proud of a piece of code before, there're probably a lot of better ways to do this, but this one is mine
    keydown(input){
        if (input["key"] == " " && this.player["in_air"]) return;
        const index = this.input_stack.indexOf(input["key"]);
        if (index == -1) this.input_stack.push(input["key"]);
    }

    keyup(input){
        //Removes the key from the array
        var index = this.input_stack.indexOf(input["key"]);
        if (index !== -1) this.input_stack.splice(index, 1);
    }

    draw_text(){
        this.ctx.fillStyle = "White";
        this.ctx.font = "40px Arial";

        text = "CEL: " + this.goal_number;
        var text_x = 10;
        var text_y = this.canvas.height - 10;
        this.ctx.fillText(text, text_x, text_y);

        var text = "OBECNA LICZBA: " + this.current_number;
        const text_width = this.ctx.measureText(text).width;
        text_x = this.canvas.width - text_width - 10;
        this.ctx.fillText(text, text_x, text_y);
    }
    
    won(){
        this.end = true;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image_background, 0, 0);

        //So much garbage for a simple text
        this.ctx.fillStyle = "Lime";
        this.ctx.font = "120px Arial";
        const text = "Wygrałeś";
        const text_width = this.ctx.measureText(text).width;
        const text_x = (this.canvas.width - text_width) / 2;
        const text_y = this.canvas.height / 2;
        this.ctx.fillText(text, text_x, text_y);
    }

    //BUTTON ----------------------------------------------------------
    generate_buttons(){
        var buttons = [];
        //calculates space between every button
        const free_space = Math.round((this.canvas.width - (this.button_size["width"] * 8)) / 9);
        const y = 10;
        var x = free_space;
        
        //max number ingame is 255 thus 8 buttons (bits)
        for (var i = 0; i < 8; i++){
            var hashmap = {};
            hashmap["x"] = x;
            hashmap["y"] = y;
            hashmap["value"] = 2**(7-i);
            hashmap["active"] = false;

            buttons.push(hashmap);
            x += free_space + this.button_size["width"];
        }

        return buttons;
    }

    draw_buttons(){
        //Creates a square for every button
        for (const button of this.buttons){
            //If button is active, paint it in green
            if (button["active"]) this.ctx.drawImage(this.image_on, button["x"], button["y"]);
            else this.ctx.drawImage(this.image_off, button["x"], button["y"]);
        }
    }

    push_button(i){
        //Change button state
        this.buttons[i]["active"] = !this.buttons[i]["active"];
        if (this.buttons[i]["active"]) this.current_number += this.buttons[i]["value"];
        else this.current_number -= this.buttons[i]["value"];

        if (this.current_number == this.goal_number) this.won();
    }

    //PLAYER ----------------------------------------------------------
    move_player(){
        //If no key is pressed, start slowing down the player
        if (this.key == -1){
            this.player["vel_x"] *= this.properties["friction"];

            //Stop the player is he is going veeeeeerrrryyy slowly
            if (Math.abs(this.player["vel_x"]) < 0.5) this.player["vel_x"] = 0;
        };

        //Vertical movement
        if (this.player["in_air"]) this.player["vel_y"] += this.properties["gravity"];
        if (this.key == " "){
            this.player["in_air"] = true;
            this.player["vel_y"] = this.player["jump_force"];
            
            //Removes space from input stack
            this.input_stack.splice(this.input_stack.indexOf(" "), 1);
        }
        
        //Horizontal movement
        if (this.key == "a"){
            this.player["vel_x"] = -this.player["speed"];
            this.state = "left";
        }
        if (this.key == "d"){
            this.player["vel_x"] = this.player["speed"];
            this.state = "right";
        }

        if (this.player["vel_x"] == 0 && !this.player["in_air"]) this.state = "idle";

        //Check if moving the player will cause it to go thru the boundary, if yes, then don't move (150$ please)
        const collides = this.boundaries_collisions(this.player["x"] + this.player["vel_x"], this.player["y"] + this.player["vel_y"]);

        //Changing the player actual position
        if (!collides["horizontally"]) this.player["x"] += this.player["vel_x"];
        if (!collides["vertically"]) this.player["y"] += this.player["vel_y"];
        else this.player["in_air"] = false;

    }

    animate_player(){
        if (this.state == "idle") this.image = this.image_idle;
        if (this.state == "left") this.image = this.image_left;
        if (this.state == "right") this.image = this.image_right;

        this.ctx.drawImage(this.image, this.frame * 165, 0, 165, 200, this.player["x"] - 50, this.player["y"], 165, 200);
        
        if (this.frame < this.frame_count) this.frame++;
        else this.frame = 0;
    }

    boundaries_collisions(x, y){
        //You have to add player width and height because player position is at it's top left corner
        var collides = {};
        collides["horizontally"] = x+this.player["width"] > this.canvas.width || x < 0;
        collides["vertically"] = y+this.player["height"] > this.canvas.height;
        return collides;
    }

    button_collisions(){
        //If you have no idea what's going on, you're not alone (:
        for (var i = 0; i < 8; i++){
            if (this.player["x"] < this.buttons[i]["x"] + this.button_size["width"] &&
                this.player["x"] + this.player["width"] > this.buttons[i]["x"] &&
                this.player["y"] < this.buttons[i]["y"] + this.button_size["height"] &&
                this.player["y"] + this.player["height"] > this.buttons[i]["y"])
            {
                //Only change button state once after touching it
                if (this.already_collided) return;

                this.already_collided = true;
                this.push_button(i);
                return;
            }
        }

        this.already_collided = false;
    }


    //GAME ------------------------------------------------------------
    async update(){
        if (this.input_stack.length == 0) this.key = -1;
        else this.key = this.input_stack[this.input_stack.length - 1];
        //Press e to exit the game
        if (this.key == "e" || this.end) return;

        //Resets the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image_background, 0, 0);
        this.draw_buttons();

        this.draw_text();

        //Move and draw the player
        this.move_player();
        this.animate_player();
        //Check if player collided with any button
        this.button_collisions();
        //Yes I know delta time and shit but I don't care, this game would run in 1000 fps anyway
        await this.sleep(1000/this.fps);
        requestAnimationFrame(this.update);
    }

    constructor(){
        //Misc
        this.player = {};
        this.properties = {};
        this.button_size = {};
        this.fps = 60;
        this.already_collided = false;
        this.end = false;

        //Getting canvas functionality
        this.canvas = document.getElementById("game");
        this.ctx = this.canvas.getContext("2d");

        //Setting Images
        this.image_background = new Image();
        this.image_background.src = "assets/background.png";
        this.image_on = new Image();
        this.image_on.src = "assets/on.png";
        this.image_off = new Image();
        this.image_off.src = "assets/off.png";
        this.image_idle = new Image();
        this.image_idle.src = "assets/idle.png";
        this.image_right = new Image();
        this.image_right.src = "assets/right.png";
        this.image_left = new Image();
        this.image_left.src = "assets/left.png";

        //Setting player data
        this.player["width"] = 65;
        this.player["height"] = 200;
        //Puts the player in the center (Btw, I use canvas.width instead of canvas["width"] because I didn't know you can recall a hashmap element with both the ".element" and ["element"] before) 
        this.player.x = (this.canvas.width / 2) - (this.player["width"] / 2);
        this.player["y"] = this.canvas.height - this.player["height"];
        this.player["speed"] = 15;
        //Jump force is negative because y is 0 at the top, so you have to lower the y to go up 
        this.player["jump_force"] = -60;
        this.player["in_air"] = true;
        //Hashmap keys don't autocomplete so I'm gonna use shortcuts and I won't fill guilty
        this.player["vel_x"] = 0;
        this.player["vel_y"] = 0;
        this.state = "idle";
        this.frame = 0;
        this.frame_count = 10;

        //Adding world properties
        this.properties["friction"] = 0.75;
        this.properties["gravity"] = 5;

        //Putting buttons in the correct place
        this.button_size["width"] = 150;
        this.button_size["height"] = 220;
        this.buttons = this.generate_buttons();

        //Keypress detection
        this.key = -1;
        this.input_stack = [];
        document.addEventListener("keydown", this.keydown.bind(this));
        document.addEventListener("keyup", this.keyup.bind(this));

        //Numbers
        this.goal_number = Math.floor(Math.random() * 255) + 1;
        this.current_number = 0;

        //No idea what this is and what it does but it removed an error, chatgpt for the win
        this.update = this.update.bind(this);
        //Start the game loop
        this.update();
    }
}

game = new Game_engine();