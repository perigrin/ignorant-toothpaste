class Game {
	tileSize = 10;
	width = 80;
	height = 50;

	constructor() {
		const canvas = document.querySelector('#game');
		const ctx = canvas.getContext("2d");

		canvas.width = this.tileSize * this.width;
		canvas.height = this.tileSize * this.height;
		canvas.style.width = canvas.width + 'px' ;
		canvas.style.height = canvas.height + 'px';

		ctx.font = this.tileSize + 'px serif';

		this.x = this.width / 2;
		this.y = this.height / 2;

		this.ctx = ctx;
		this.canvas = canvas;
	}

	handleInput(e) {
		if (e.key == "h") this.x--;
		if (e.key == "j") this.y++;
		if (e.key == "k") this.y--;
		if (e.key == "l") this.x++;
	}

	draw() {
		const { x, y, tileSize, ctx, canvas } = this;
		ctx.clearRect(0,0,canvas.width, canvas.height);
		ctx.fillText(
			'@',
			x*tileSize,
			y*tileSize,
		);
	}
}



