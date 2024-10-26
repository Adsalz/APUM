// src/components/MultiSelect.js
import React, { useState, useRef, useEffect } from 'react';

function MultiSelect({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (optionId) => {
    const newValue = {
      ...value,
      [optionId]: !value[optionId]
    };
    onChange(newValue);
  };

  const getSelectedCount = () => {
    return Object.values(value).filter(Boolean).length;
  };

  const toggleAll = () => {
    const allSelected = options.every(option => value[option.id]);
    const newValue = {};
    options.forEach(option => {
      newValue[option.id] = !allSelected;
    });
    onChange(newValue);
  };

  return (
    <div className="multiselect" ref={dropdownRef}>
      <div className="multiselect-header" onClick={handleToggle}>
        <span>
          {getSelectedCount() === 0 
            ? placeholder 
            : `${getSelectedCount()} sélectionné${getSelectedCount() > 1 ? 's' : ''}`}
        </span>
        <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
      </div>
      {isOpen && (
        <div className="multiselect-dropdown">
          <div className="select-all" onClick={toggleAll}>
            <input
              type="checkbox"
              checked={options.every(option => value[option.id])}
              readOnly
            />
            <span>Tout sélectionner</span>
          </div>
          {options.map(option => (
            <div
              key={option.id}
              className="multiselect-option"
              onClick={() => handleOptionClick(option.id)}
            >
              <input
                type="checkbox"
                checked={value[option.id] || false}
                readOnly
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MultiSelect;