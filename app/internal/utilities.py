import numpy as np
from utide.utilities import Bunch

def json_to_utide_coef(data, is_bunch=True):
    '''
    Function to transform coefficient values from JSON to utide.Bunch
    '''
    # 1. If it's a list convert to numpy array
    if isinstance(data, list):
        return np.array(data)
    
    # 2. If it's a dictionary, we decide its container type
    if isinstance(data, dict):
        # We create a standard dict first
        processed = {}
        for k, v in data.items():
            # Only 'aux' should trigger a Bunch for its children
            should_child_be_bunch = (k == 'aux')
            processed[k] = json_to_utide_coef(v, is_bunch=should_child_be_bunch)
        
        # Wrap in Bunch only if specified (for Root and Aux)
        return Bunch(processed) if is_bunch else processed
    # 3. Primitives
    return data