// define new note component
var Note = Vue.extend({
  props: ['id','content', 'type', 'position'], //text
  data: function() {
    return {
      nClass: {
        active: false,
        dragging: false,
        neutral: false,
        positive: false,
        improvement: false
      },
      nStyle: {
        left: ""
      },

      // Meta data
      fontSize: 1, //em

      // Dragging data
      oldPosition: {},
      tempPosition: {},
      start: { x: 0, y: 0 }
    };
  },
  template: '#custom-note-template',

  events: {
    'reset-active' : function() {
      this.nClass.active=false;
    }
  },

  methods: {
    removeNote: function () {
      this.$dispatch('remove', this["id"] );
    },
    incrFontSize: function() {
      var step = 0.5, max = 2.5;
      this.fontSize = (this.fontSize + step <= max) ? this.fontSize + step : max;

    },
    decFontSize: function() {
      var step = 0.5, min = 0.5;
      this.fontSize = (this.fontSize - step >= min) ? this.fontSize - step : min;
    },

    setActive: function( e ) {
      this.nClass.active = true;
    },
    startDrag: function( e ) {
      this.$dispatch("start_drag", this);
      this.nClass.active=true;
      this.start.x = e.pageX;
      this.start.y = e.pageY;
      this.oldPosition = this.position;
      this.$on("global_mousemove", this.onMouseMove);
    },
    onMouseMove: function( e ) {
      var dx = e.pageX - this.start.x,
          dy = e.pageY - this.start.y;

      if (e.buttons != 0 &&
         document.activeElement !== this.$el.querySelector("textarea")) {
        e.preventDefault();

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
          this.nClass.dragging = true;
        } else {
          this.nClass.dragging = false;
        }

        var newX = this.oldPosition.x + dx,
            newY = this.oldPosition.y + dy;
        this.nStyle.left = newX + "px";
        this.nStyle.top = newY + "px";
        this.position = {x: newX, y: newY };
        
        e.stopPropagation();
      }

    },
    stopDrag: function( e ) {
      if( e.pageX - this.start.x === 0 &&
          e.pageY - this.start.y === 0 ) {
          this.$el.querySelector("textarea").focus();
          this.nClass.active = true;
      }
      this.nClass.dragging = false;
      this.$dispatch("stop_drag", this);
      this.$off("global_mousemove");
    }
  },

  ready: function() {
    this.$nextTick(function () {
      this.nStyle.left = this.position.x + "px";
      this.nStyle.top = this.position.y + "px";
      this.nClass[this.type] = true;
    });
  }
})

// Sidebar with saved boards
var SavedBoards = Vue.extend({
  props: ['boards','activeBoardIndex'],
  data: function() { return {
      expanded: false,
  } },
  template: '#saved-boards',
  events: {
    'toggle-sidebar': function(e) {
      this.toggle();
    }
  },
  methods: {
    loadBoard: function (id ) {
      this.$dispatch('load-board', id);
    },
    createBoard: function () {
      this.$dispatch('create-board');
    },
    toggle: function() {
      this.expanded = !this.expanded;
    }
  }
});

// register custom component
Vue.component('custom-note', Note);
Vue.component('saved-boards', SavedBoards);


// root app
new Vue({
  el: '#app',
  data: {
    activeDrag: null,
    activeBoardIndex: 0,
    boards: [ {
      title: "My retrospective for <date>",
      notes: []
    } ]
  },
  computed: {
    activeBoard: function() {
      if (!Array.isArray(this.boards)) {
        return this.createBoard();
      }
      return this.boards[this.activeBoardIndex];
    }
  },
  events: {
    'remove' : function( id ) {
      this.activeBoard.notes.splice( id, 1 );
    },
    'start_drag': function(child) {
      //Reset the currently selected note
      this.resetActive();

      this.activeDrag = child;

      //move an active note visually to the top
      var activeNote = this.activeBoard.notes.splice( child.id, 1 );
      this.activeBoard.notes.push(activeNote[0]);
    },
    'stop_drag': function(child) {
      this.activeDrag = null;
    },
    'load-board' : function( id ) {
      this.activeBoardIndex = id;
    },
    'create-board' : function() {
      this.boards.push(this.createBoard());
      this.activeBoardIndex = this.boards.length-1;
    }
  },
  methods: {
    addNote: function (type) {
      var placeholderText;

      switch (type) {
        case "improvement": placeholderText = "This needs some improvement";
        break;
        case "neutral": placeholderText = "Just a remark";
        break;
        case "positive": placeholderText = "This went well";
        break;
      }

      var x = Math.floor( (Math.random() * 20 ) -10 ),
          y = Math.floor( (Math.random() * 20 ) -10 );

      var note = {
        text: placeholderText,
        note_type: type,
        position: {x:x, y:y}
      };

      this.activeBoard.notes.push(note)
    },
    createBoard: function() {
      var board = {
        title: "New board",
        notes: []
      };
      return board;
    },
    onMouseMove: function(e) {
      if (this.activeDrag) {
        this.activeDrag.$emit("global_mousemove", e);
      }
    },
    clear: function() {
      this.activeBoard.notes.splice(0, this.activeBoard.notes.length);
    },
    resetActive: function() {
      this.$broadcast('reset-active');
    },
    toggleSidebar: function() {
      this.$broadcast('toggle-sidebar');
    },

    // Loads recent config from localstorage
    loadState: function() {
      var storage = window.localStorage;

      //Check if there is saved content available
      var loadedContent = storage.getItem('retrospective-board');
      if ( loadedContent ) {
        this.boards = JSON.parse(loadedContent);
      }
    },

    // Saves current config to localstorage
    saveState: function( e ) {
      e.currentTarget.disabled = true;

      var storage = window.localStorage;
      var content = JSON.stringify( this.boards );
      storage.setItem('retrospective-board', content);

      e.currentTarget.disabled = false;
    }
  },

  created: function() {
    this.loadState();
  }
})
