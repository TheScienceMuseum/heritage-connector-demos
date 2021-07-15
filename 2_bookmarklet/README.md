# bookmarklet

A bookmarklet to show connections from one page its direct connections in the graph. Meant to be a quick way to prototype future collection website widgets.

The idea and backbone of the code are based on [Roderic Page](https://github.com/rdmpage)'s work for the [TANC Heritage PIDs](https://tanc-ahrc.github.io/HeritagePIDs/) project. 

## The bookmarklet:

[HC lookup](javascript:(function(a){%20a=document.createElement('script');a.type='text/javascript';a.src='//cdn.jsdelivr.net/gh/TheScienceMuseum/heritage-connector-demos/2_bookmarklet/script.js';document.getElementsByTagName('body')[0].appendChild(a);})();)

