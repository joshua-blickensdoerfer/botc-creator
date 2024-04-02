import React, { useEffect, useState } from 'react';
import './Botc.css';
import axios from 'axios';
import { fetchData } from './apiServer';
import { DragDropContext, Draggable, DropResult, Droppable } from 'react-beautiful-dnd';
import Collapsible from 'react-collapsible';

interface Faction {
    name: string;
    characters: Character[];
}
  
interface Character {
  gender: string,
  ability: string,
  script: string,
  name: Name;
}

interface Name {
  ger: string;
  eng: string;
}

interface postData {
  factionId: number;
  characterId: number;
}

const Botc: React.FC = () => {
    const [leftFactions, setLeftFactions] = useState<Faction[]>([]);
    const [rightFactions, setRightFactions] = useState<Faction[]>([]);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [scriptName, setScriptName] = useState<string>("");
    const [abilityFilter, setAbilityFilter] = useState<string>("");
    const [expansionFilter, setExpansionFilter] = useState<Map<string, Boolean>>(new Map<string,Boolean>([
      ["Trouble Brewing", true],
      ["Bad Moon Rising", true],
      ["Sects and Violets", true],
      ["Experimental", true],
      ["Sonstige", true],
    ]))
    const [redraw, setRedraw] = useState<Boolean>(false);

    useEffect(() => {
      // Fetch data from the REST endpoint
      fetchAll("");


        
    }, []);

    const fetchAll =  async (filter: string) => {
        const responseLeft = await fetchData("left", filter)
        setLeftFactions(responseLeft["factions"]);

        const responseRight = await fetchData("right", "")
        console.log(responseRight["factions"])
        setRightFactions(responseRight["factions"]);

      try {

      } catch (error) {
        console.log(error)
      }
    }

    const handleLeftToRight = async (factionIndex: number, charIndex: number) => {
      try {

        var postData: Faction[] = rightFactions;
        postData[factionIndex].characters.push(leftFactions[factionIndex].characters[charIndex])
        var response = await axios.post('http://localhost:8080/right', postData);

        postData = leftFactions;
        postData[factionIndex].characters.splice(charIndex, 1)
        response = await axios.post('http://localhost:8080/left', postData);
      } catch (error) {
        console.log("Error")
      }
      fetchAll(nameFilter);
    }

    const handleRightToLeft = async (factionIndex: number, charIndex: number) => {
      try {
        var postData: Faction[] = leftFactions;
        postData[factionIndex].characters.push(rightFactions[factionIndex].characters[charIndex])
        var response = await axios.post('http://localhost:8080/left', postData);

        postData = rightFactions;
        postData[factionIndex].characters.splice(charIndex, 1)
        response = await axios.post('http://localhost:8080/right', postData);
      } catch (error) {
        console.log("Error")
      }
      fetchAll(nameFilter);
    }

    const createPDF = async () => {
      try {
        const response = await axios.post('http://localhost:8080/createPDF', {name: scriptName});
      } catch (error) {
        console.log("Error")
      }
    }

    const handleDragEnd = async (result: DropResult, factionIndex: number) => {

      if (!result.destination) return;
  
      const newItems = Array.from(rightFactions[factionIndex].characters);
      const [removed] = newItems.splice(result.source.index, 1);
      newItems.splice(result.destination.index, 0, removed);

      rightFactions[factionIndex].characters = newItems
  
      setRightFactions(rightFactions);

      try {
        await axios.post('http://localhost:8080/right', rightFactions);
      } catch (error) {
        console.log("Error")
      }
      fetchAll(nameFilter);
    };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNameFilter(event.target.value);
    fetchAll(event.target.value);
  };

  const handleChangeAbility = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAbilityFilter(event.target.value);
    fetchAll(event.target.value);
  };

  const handleCheckboxChange = (key: string) => {
    expansionFilter.set(key, !(expansionFilter.get(key) || false))
    setExpansionFilter(expansionFilter)
    setRedraw(!redraw)
  };

  const changeScript = (event: React.ChangeEvent<HTMLInputElement>) => {
    setScriptName(event.target.value);
  };


  const filter = (factionIndex: number, charIndex: number): Boolean => {
    var show: Boolean = true
    show = show && (leftFactions[factionIndex].characters[charIndex].name.ger.toLowerCase().includes(nameFilter.toLowerCase()) ||
                    leftFactions[factionIndex].characters[charIndex].name.eng.toLowerCase().includes(nameFilter.toLowerCase()))
    show = show && leftFactions[factionIndex].characters[charIndex].ability.toLowerCase().includes(abilityFilter.toLowerCase())
    switch (leftFactions[factionIndex].characters[charIndex].script) {
      case "TB": {
        show = show && (expansionFilter.get("Trouble Brewing") || false);
        break;
      }
      case "BMR": {
        show = show && (expansionFilter.get("Bad Moon Rising") || false);
        break;
      }
      case "SaV": {
        show = show && (expansionFilter.get("Sects and Violets") || false);
        break;
      }
      case "Exp": {
        show = show && (expansionFilter.get("Experimental") || false);
        break;
      }
      default: {
        show = show && (expansionFilter.get("Sonstige") || false);
        break;
      }
    }
    return show
  }

  return (
    <div className="container">
        <div className="left">
        <label htmlFor="inputField">Name Search:<br/></label>
        <input
          type="text"
          id="inputField"
          value={nameFilter}
          onChange={handleChange}
        />
        <label htmlFor="inputField"><br/>Ability Search:<br/></label>
        <input
          type="text"
          id="inputFieldAbility"
          value={abilityFilter}
          onChange={handleChangeAbility}
        />
        {Array.from(expansionFilter.entries()).map(([key, value]) => (
          <div className='setButtons'>
            <label >
              <span><br/>{key}</span>
              <input
                type="checkbox"
                checked={!!value}
                onChange={() => handleCheckboxChange(key)}
              />
            </label>
            </div>
            )
        )}


      {leftFactions.map((faction, index) => (
        <div className="chars">
        <Collapsible trigger={faction.name}>
        <ul>
            {faction.characters.map((item, ix) => (
            filter(index, ix) &&
            <li key={`${index}-${ix}`} onClick={() => handleLeftToRight(index, ix)} >
                {item.name.ger}  <span className="englishList">({item.name.eng})</span>
            </li>
            ))}
        </ul>
        </Collapsible>
        </div>
      )) }
        </div>
        <div className="right">
        <label htmlFor="inputField">Script Name:</label>
        <input
          type="text"
          id="inputField"
          value={scriptName}
          onChange={changeScript}
        />
      {rightFactions.map((faction, index) => (
        <div className="chars">
        <h2>{faction.name}</h2>
          <DragDropContext onDragEnd={(result) => handleDragEnd(result, index)}>
            <Droppable droppableId={`${index}`} key={index}>
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef}>
                    {faction.characters.map((item, ix) => (
                        <Draggable key={`${index}-${ix}`} draggableId={`${index}-${ix}`} index={ix}>
                        {(provided) => (
                          <li key={`${index}-${ix}`}  
                              onClick={() => handleRightToLeft(index, ix)} 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              {...provided.dragHandleProps}
                          >

                              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                                <div style={{ marginRight: '10px', flex: 15 }}><b>{item.name.ger}</b></div>
                                <div style={{ marginRight: '10px', flex: 75 }}>{item.ability}</div>
                                <div style={{ marginRight: '10px', flex: 5 }}>{item.script}</div>
                                <div style={{ flex: 5}}>{item.gender}   </div>
                              </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )) }
      </div>
      <div>
        <button onClick={createPDF}>Create PDF</button>
    </div>
    </div>
  );
};

export default Botc;
