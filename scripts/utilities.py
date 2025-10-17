def colours(colour):
    return {
        'CYAN': '\033[96m',
        'RED' : "\033[31m",
        'BOLD': '\033[1m',
        'ENDC': '\033[0m',
    }.get(colour, 0)

def coloured_fn_name(colour):
    import inspect        
    return f"{colours(colour)}[{inspect.currentframe().f_back.f_code.co_name}]{colours("ENDC")}"